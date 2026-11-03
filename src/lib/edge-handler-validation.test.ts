import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  DEFAULT_PRIMARY,
  DEFAULT_FALLBACK,
  generateYandexAdvice,
  modelUri,
  YandexProviderError,
} from "../../supabase/functions/zapruda-daily-advice/yandex-provider";

type EdgeHandler = (request: Request) => Promise<Response>;
type FunctionName = "openweather-current" | "zapruda-daily-advice";
type HandlerOptions = {
  providerStatus?: number;
  providerError?: Error;
  providerResponse?: Response;
  anonymous?: boolean;
  authError?: boolean;
  rpc?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  storedAdvice?: Record<string, unknown>;
  env?: Record<string, string>;
};

// Execute the actual handler source with only its Deno host and dependencies mocked.
// These tests use no real accounts, keys, JWTs, Supabase calls or provider requests.
function loadHandler(name: FunctionName, providerBody = "{}", options: HandlerOptions = {}) {
  let handler: EdgeHandler | undefined;
  const rpc = vi.fn(
    options.rpc ??
      (async () => {
        throw new Error("Unexpected database call in input-validation test");
      }),
  );
  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: {
            id: "offline-unit-user",
            is_anonymous: options.anonymous ?? false,
            email_confirmed_at: "2026-01-01T00:00:00Z",
          },
        },
        error: options.authError ? { message: "Offline invalid token fixture" } : null,
      })),
    },
    rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: options.storedAdvice ?? null, error: null }),
      };
      return query;
    },
  };
  const providerFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    if (options.providerError) throw options.providerError;
    if (options.providerResponse) return options.providerResponse;
    return new Response(providerBody, { status: options.providerStatus ?? 200 });
  });
  const source = readFileSync(
    join(process.cwd(), "supabase", "functions", name, "index.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(compiled, {
    exports: {},
    require(specifier: string) {
      if (specifier === "npm:@supabase/supabase-js@2.49.0") {
        return { createClient: () => client };
      }
      if (specifier === "jsr:@supabase/functions-js/edge-runtime.d.ts") return {};
      if (specifier === "./yandex-provider.ts")
        return {
          DEFAULT_PRIMARY,
          DEFAULT_FALLBACK,
          modelUri,
          YandexProviderError,
          generateYandexAdvice: (
            config: Parameters<typeof generateYandexAdvice>[0],
            input: Parameters<typeof generateYandexAdvice>[1],
          ) => generateYandexAdvice(config, input, providerFetch as typeof fetch),
        };
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
    Deno: {
      env: {
        get: (name: string) =>
          options.env?.[name] ??
          (name === "YANDEX_AI_FOLDER_ID"
            ? "b1gexample123"
            : name === "YANDEX_AI_API_KEY"
              ? "test-only-not-a-real-key"
              : ["YANDEX_AI_PRIMARY_MODEL", "YANDEX_AI_FALLBACK_MODEL", "YANDEX_AI_WEB_SEARCH_ENABLED"].includes(name)
                ? undefined
                : "offline-test-placeholder"),
      },
      serve(fn: EdgeHandler) {
        handler = fn;
      },
    },
    Request,
    Response,
    URL,
    URLSearchParams,
    AbortSignal,
    fetch: providerFetch,
  });
  if (!handler) throw new Error("Edge handler was not registered");
  return { handler, providerFetch, rpc };
}

function request(body: string, authenticated = true) {
  return new Request("https://offline-test.invalid", {
    method: "POST",
    headers: {
      ...(authenticated ? { Authorization: "Bearer offline-test-placeholder" } : {}),
      "Content-Type": "application/json",
    },
    body,
  });
}

describe.each<FunctionName>(["openweather-current", "zapruda-daily-advice"])(
  "%s request validation (offline handler tests)",
  (name) => {
    it.each(["missing", "invalid", "anonymous"])(
      "rejects %s authentication before upstream work",
      async (mode) => {
        const { handler, providerFetch, rpc } = loadHandler(name, "{}", {
          authError: mode === "invalid",
          anonymous: mode === "anonymous",
        });
        const response = await handler(
          request(
            JSON.stringify({ city: "Test City", location: "Offline fixture" }),
            mode !== "missing",
          ),
        );
        expect(response.status).toBe(401);
        expect(providerFetch).not.toHaveBeenCalled();
        expect(rpc).not.toHaveBeenCalled();
      },
    );
    it.each(["null", "[]", "false", "17", '"text"', "{"])(
      "rejects %s with 400 before any database or provider call",
      async (body) => {
        const { handler, providerFetch, rpc } = loadHandler(name);
        const response = await handler(request(body));
        expect(response.status).toBe(400);
        expect(providerFetch).not.toHaveBeenCalled();
        expect(rpc).not.toHaveBeenCalled();
      },
    );
  },
);

describe("OpenWeather upstream validation (offline handler tests)", () => {
  const validWeather = JSON.stringify({
    main: { temp: 15, pressure: 1000 },
    weather: [{ description: "облачно" }],
  });

  it.each([true, [], {}])("rejects non-text city input %j", async (city) => {
    const { handler, providerFetch } = loadHandler("openweather-current", validWeather);
    expect((await handler(request(JSON.stringify({ city })))).status).toBe(400);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it.each([
    { lat: 0, lon: 0 },
    { lat: "0", lon: "0" },
  ])("accepts numeric coordinates including zero %j", async (coordinates) => {
    const { handler } = loadHandler("openweather-current", validWeather);
    expect((await handler(request(JSON.stringify(coordinates)))).status).toBe(200);
  });

  it.each([401, 403, 404, 429, 500])("handles upstream HTTP %s safely", async (status) => {
    const { handler } = loadHandler("openweather-current", "upstream private diagnostic", {
      providerStatus: status,
    });
    const response = await handler(request(JSON.stringify({ city: "Test City" })));
    expect(response.status).toBe(
      status === 401 || status === 403 ? 503 : status === 404 ? 404 : status === 429 ? 429 : 502,
    );
    expect(JSON.stringify(await response.json())).not.toContain("upstream private diagnostic");
  });

  it("handles a provider timeout", async () => {
    const { handler } = loadHandler("openweather-current", "", {
      providerError: new Error("Offline timeout fixture"),
    });
    expect((await handler(request(JSON.stringify({ city: "Test City" })))).status).toBe(502);
  });

  it("limits the per-isolate weather request burst", async () => {
    const { handler, providerFetch } = loadHandler("openweather-current", validWeather);
    for (let i = 0; i < 20; i++)
      expect((await handler(request(JSON.stringify({ city: "Test City" })))).status).toBe(200);
    expect((await handler(request(JSON.stringify({ city: "Test City" })))).status).toBe(429);
    expect(providerFetch).toHaveBeenCalledTimes(20);
  });

  it.each([
    { lat: true, lon: false },
    { lat: [], lon: [] },
    { lat: {}, lon: 0 },
  ])("rejects non-numeric coordinate types %j", async (coordinates) => {
    const { handler, providerFetch } = loadHandler("openweather-current", validWeather);
    expect((await handler(request(JSON.stringify(coordinates)))).status).toBe(400);
    expect(providerFetch).not.toHaveBeenCalled();
  });
  it.each([
    "null",
    "[]",
    "{}",
    JSON.stringify({ main: { temp: 15, pressure: 1000 }, weather: [{ description: 123 }] }),
  ])("returns 502 for malformed upstream data %s", async (payload) => {
    const { handler, providerFetch, rpc } = loadHandler("openweather-current", payload);
    const response = await handler(request(JSON.stringify({ city: "Test City" })));
    expect(response.status).toBe(502);
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserves valid weather units and omits coordinates from autofill", async () => {
    const { handler } = loadHandler(
      "openweather-current",
      JSON.stringify({
        name: "Test City",
        coord: { lat: 0, lon: 0 },
        main: { temp: 15.25, pressure: 1000, humidity: 60 },
        wind: { speed: 3.25, deg: 90 },
        weather: [{ description: "  облачно  " }],
      }),
    );
    const response = await handler(request(JSON.stringify({ city: "Test City" })));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("OpenWeather");
    expect(body.report_fields).toEqual({
      weather_summary: "облачно",
      air_temperature_c: 15.3,
      pressure_mmhg: 750,
      wind_direction: "В",
      wind_speed_ms: 3.3,
    });
    expect(body).not.toHaveProperty("coord");
    expect(body).not.toHaveProperty("lat");
    expect(body).not.toHaveProperty("lon");
  });
});

describe("Yandex AI lease, quota and safe provider errors (offline handler tests)", () => {
  const adviceRequest = () => request(JSON.stringify({ location: "Offline river fixture" }));
  const answer =
    "A deterministic offline fishing advice fixture long enough for the handler validation.";
  const completion = JSON.stringify({ choices: [{ message: { content: answer } }] });
  const rpcSuccess = async (name: string) => ({
    data:
      name === "claim_ai_daily_advice_slot"
        ? { ok: true, id: "offline-advice", lease_token: "offline-lease" }
        : { ok: true },
    error: null,
  });

  it("returns real generated answer only after a successful slot completion", async () => {
    const { handler, providerFetch, rpc } = loadHandler("zapruda-daily-advice", completion, {
      rpc: rpcSuccess,
    });
    const response = await handler(adviceRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.answer).toBe(answer);
    expect(body.provider).toBe("yandex-deepseek");
    expect(body.model).toBe("deepseek-v4.1-flash");
    expect(body.web_search).toBe("disabled");
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(
      rpc.mock.calls.find(([name]) => name === "complete_ai_daily_advice_slot")?.[1],
    ).toMatchObject({ p_success: true, p_model: DEFAULT_PRIMARY });
  });

  it.each([
    ["already_used", 200],
    ["too_many_failures", 429],
    ["lease_held", 409],
  ] as const)("does not invoke Yandex after a %s claim", async (reason, status) => {
    const { handler, providerFetch } = loadHandler("zapruda-daily-advice", completion, {
      rpc: async () => ({
        data: { ok: false, reason, answer: reason === "already_used" ? answer : undefined },
        error: null,
      }),
    });
    expect((await handler(adviceRequest())).status).toBe(status);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("returns 500 without upstream invocation after claim RPC failure", async () => {
    const { handler, providerFetch } = loadHandler("zapruda-daily-advice", completion, {
      rpc: async () => ({ data: null, error: { message: "Internal SQL details" } }),
    });
    expect((await handler(adviceRequest())).status).toBe(500);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, "YANDEX_INVALID_KEY"],
    [403, "YANDEX_ACCESS_DENIED"],
    [404, "YANDEX_MODEL_UNAVAILABLE"],
    [429, "YANDEX_RATE_LIMITED"],
    [500, "YANDEX_UPSTREAM_UNAVAILABLE"],
  ] as const)("masks Yandex HTTP %s and preserves failed slot (%s)", async (status, code) => {
    const { handler, providerFetch, rpc } = loadHandler(
      "zapruda-daily-advice",
      "Private Yandex error payload or credential",
      { rpc: rpcSuccess, providerStatus: status },
    );
    const response = await handler(adviceRequest());
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain("Private Yandex");
    expect(
      rpc.mock.calls.find(([name]) => name === "complete_ai_daily_advice_slot")?.[1],
    ).toMatchObject({ p_success: false, p_error_message: code });
    expect(providerFetch).toHaveBeenCalledTimes([429, 500].includes(status) ? 2 : 1);
  });

  it("caches valid completed advice and never calls provider again", async () => {
    const { handler, providerFetch, rpc } = loadHandler("zapruda-daily-advice", completion, {
      storedAdvice: {
        status: "ready",
        answer,
        attempts: 1,
      },
    });
    const response = await handler(adviceRequest());
    expect(response.status).toBe(200);
    expect((await response.json()).already_used).toBe(true);
    expect(providerFetch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks request while a valid lease is held", async () => {
    const { handler, providerFetch } = loadHandler("zapruda-daily-advice", completion, {
      storedAdvice: {
        status: "pending",
        lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
        attempts: 0,
      },
    });
    expect((await handler(adviceRequest())).status).toBe(409);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("diagnostic is read-only and limited to STAGING", async () => {
    const diagnostic = request(JSON.stringify({ action: "diagnose" }));
    const blocked = loadHandler("zapruda-daily-advice", completion);
    expect((await blocked.handler(diagnostic)).status).toBe(404);
    expect(blocked.providerFetch).not.toHaveBeenCalled();
    const allowed = loadHandler("zapruda-daily-advice", completion, {
      env: { SUPABASE_URL: "https://yudtbifopfnjtjanaqrd.supabase.co" },
    });
    const response = await allowed.handler(request(JSON.stringify({ action: "diagnose" })));
    const body = await response.json();
    expect(body).toMatchObject({
      diagnostic_only: true,
      provider: "yandex-ai-studio",
      configuration: "ready",
      primary_model: "deepseek-v4.1-flash",
      fallback_model: "yandexgpt-5.1",
      web_search_enabled: false,
    });
    expect(JSON.stringify(body)).not.toContain("test-only-not-a-real-key");
    expect(allowed.providerFetch).not.toHaveBeenCalled();
    expect(allowed.rpc).not.toHaveBeenCalled();
  });

  it("fails closed before taking a slot if provider credentials are missing", async () => {
    const { handler, providerFetch, rpc } = loadHandler("zapruda-daily-advice", completion, {
      env: { YANDEX_AI_API_KEY: "" },
    });
    const response = await handler(adviceRequest());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("YANDEX_KEY_MISSING");
    expect(providerFetch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
