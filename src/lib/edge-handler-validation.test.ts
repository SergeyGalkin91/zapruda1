import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  checkXaiAccess,
  normalizeXaiBase,
  normalizeXaiKey,
} from "../../supabase/functions/zapruda-daily-advice/xai-access";

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
      if (specifier === "./xai-access.ts")
        return { checkXaiAccess, normalizeXaiBase, normalizeXaiKey };
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
    Deno: {
      env: {
        get: (name: string) =>
          options.env?.[name] ??
          (name === "XAI_API_BASE"
            ? "https://api.x.ai/v1"
            : name === "XAI_MODEL"
              ? "grok-3-mini"
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

describe("Grok lease and provider failures (offline handler tests)", () => {
  const adviceRequest = () => request(JSON.stringify({ location: "Offline river fixture" }));
  const answer =
    "A deterministic offline fishing advice fixture long enough for the handler validation.";
  const rpcSuccess = async (name: string) => ({
    data:
      name === "claim_ai_daily_advice_slot"
        ? { ok: true, id: "offline-advice", lease_token: "offline-lease" }
        : { ok: true },
    error: null,
  });

  it("returns a generated answer only after the lease completion succeeds", async () => {
    const { handler, rpc } = loadHandler(
      "zapruda-daily-advice",
      JSON.stringify({ choices: [{ message: { content: answer } }] }),
      { rpc: rpcSuccess },
    );
    const response = await handler(adviceRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer, already_used: false });
    expect(
      rpc.mock.calls.find(([name]) => name === "complete_ai_daily_advice_slot")?.[1],
    ).toMatchObject({ p_success: true, p_answer: answer });
  });

  it.each([
    ["lease_held", 409],
    ["too_many_failures", 429],
  ] as const)("does not call xAI when claim returns %s", async (reason, status) => {
    const { handler, providerFetch } = loadHandler("zapruda-daily-advice", "{}", {
      rpc: async () => ({ data: { ok: false, reason }, error: null }),
    });
    expect((await handler(adviceRequest())).status).toBe(status);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("returns the cached answer without a second provider request", async () => {
    const { handler, providerFetch } = loadHandler("zapruda-daily-advice", "{}", {
      rpc: async () => ({ data: { ok: false, reason: "already_used", answer }, error: null }),
    });
    const response = await handler(adviceRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer, already_used: true });
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("does not acknowledge an answer if saving the lease completion fails", async () => {
    const rpc = async (name: string) =>
      name === "claim_ai_daily_advice_slot"
        ? rpcSuccess(name)
        : { data: null, error: { message: "Offline database failure" } };
    const { handler } = loadHandler(
      "zapruda-daily-advice",
      JSON.stringify({ choices: [{ message: { content: answer } }] }),
      { rpc },
    );
    expect((await handler(adviceRequest())).status).toBe(409);
  });

  it("returns 500 without calling xAI if the claim RPC fails", async () => {
    const { handler, providerFetch } = loadHandler("zapruda-daily-advice", "{}", {
      rpc: async () => ({ data: null, error: { message: "Offline claim failure" } }),
    });
    expect((await handler(adviceRequest())).status).toBe(500);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it.each([429, 500])(
    "records a failed lease for provider HTTP %s without persisting its raw diagnostic",
    async (status) => {
      const { handler, rpc } = loadHandler(
        "zapruda-daily-advice",
        "DO_NOT_PERSIST_PROVIDER_DIAGNOSTIC",
        { providerStatus: status, rpc: rpcSuccess },
      );
      expect((await handler(adviceRequest())).status).toBe(502);
      const call = rpc.mock.calls.find(([name]) => name === "complete_ai_daily_advice_slot");
      expect(call?.[1]).toMatchObject({ p_success: false });
      expect(JSON.stringify(call?.[1])).not.toContain("DO_NOT_PERSIST_PROVIDER_DIAGNOSTIC");
    },
  );

  it.each(["{", "null", JSON.stringify({ choices: [{ message: { content: "short" } }] })])(
    "handles invalid provider payload %s and releases its failed lease",
    async (body) => {
      const { handler, rpc } = loadHandler("zapruda-daily-advice", body, { rpc: rpcSuccess });
      expect((await handler(adviceRequest())).status).toBe(502);
      expect(
        rpc.mock.calls.find(([name]) => name === "complete_ai_daily_advice_slot")?.[1],
      ).toMatchObject({ p_success: false });
    },
  );

  it.each([
    [
      400,
      { code: "insufficient_credits", error: "Private team has no available credits" },
      "XAI_INSUFFICIENT_CREDITS",
    ],
    [400, { error: "Your team does not have any credits" }, "XAI_INSUFFICIENT_CREDITS"],
    [403, { error: { message: "Spending limit reached" } }, "XAI_INSUFFICIENT_CREDITS"],
    [
      400,
      { error: { code: "invalid_api_key", message: "Incorrect API key provided" } },
      "XAI_INVALID_API_KEY",
    ],
    [401, { message: "Private authorization details" }, "XAI_INVALID_API_KEY"],
    [400, { error: "The model does not exist" }, "XAI_MODEL_UNAVAILABLE"],
    [404, { message: "Private model details" }, "XAI_MODEL_UNAVAILABLE"],
    [403, { error: "Forbidden" }, "XAI_ACCESS_DENIED"],
    [429, { error: "Private quota diagnostic" }, "XAI_RATE_LIMITED"],
    [500, { error: "Misleading insufficient_credits diagnostic" }, "XAI_PROVIDER_UNAVAILABLE"],
  ] as const)(
    "classifies HTTP %s without exposing the provider body",
    async (status, payload, code) => {
      const marker = "DO_NOT_EXPOSE_KEY_TEAM_OR_GPS";
      const { handler, rpc } = loadHandler(
        "zapruda-daily-advice",
        JSON.stringify({ ...payload, private: marker }),
        {
          providerStatus: status,
          rpc: rpcSuccess,
        },
      );
      const response = await handler(adviceRequest());
      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.code).toBe(code);
      expect(JSON.stringify(body)).not.toContain(marker);
      const completions = rpc.mock.calls.filter(
        ([name]) => name === "complete_ai_daily_advice_slot",
      );
      expect(completions).toHaveLength(1);
      expect(completions[0]?.[1]).toMatchObject({
        p_success: false,
        p_answer: "",
        p_error_message: `xAI HTTP ${status}; ${code}`,
      });
      expect(JSON.stringify(completions)).not.toContain(marker);
    },
  );

  it.each([
    "{",
    "null",
    "[]",
    '"no available credits"',
    JSON.stringify({ extra: { code: "insufficient_credits" } }),
  ])("keeps an unrecognized HTTP 400 payload private: %s", async (payload) => {
    const { handler, rpc } = loadHandler("zapruda-daily-advice", payload, {
      providerStatus: 400,
      rpc: rpcSuccess,
    });
    const response = await handler(adviceRequest());
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("XAI_REQUEST_REJECTED");
    expect(
      rpc.mock.calls.find(([name]) => name === "complete_ai_daily_advice_slot")?.[1],
    ).toMatchObject({ p_error_message: "xAI HTTP 400; XAI_REQUEST_REJECTED", p_success: false });
  });

  it("cancels an oversized error stream without waiting for its end", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4097).fill(65));
      },
      cancel,
    });
    const { handler } = loadHandler("zapruda-daily-advice", "", {
      providerResponse: new Response(stream, { status: 400 }),
      rpc: rpcSuccess,
    });
    const response = await handler(adviceRequest());
    expect((await response.json()).code).toBe("XAI_REQUEST_REJECTED");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("never copies an unknown provider code or message into the response or journal", async () => {
    const marker = "PRIVATE_TOKEN_XYZ_123";
    const { handler, rpc } = loadHandler(
      "zapruda-daily-advice",
      JSON.stringify({
        code: marker,
        error: { code: marker, message: marker },
      }),
      { providerStatus: 400, rpc: rpcSuccess },
    );
    const response = await handler(adviceRequest());
    const body = await response.json();
    expect(body.code).toBe("XAI_REQUEST_REJECTED");
    expect(JSON.stringify({ body, calls: rpc.mock.calls })).not.toContain(marker);
  });
});

describe("Daily advice cached access and safe diagnostics (offline handler tests)", () => {
  const storedAnswer =
    "Previously generated genuine-model fixture content, long enough for the validation.";
  it("returns a ready cached answer without any provider call during an outage", async () => {
    const { handler, providerFetch, rpc } = loadHandler("zapruda-daily-advice", "", {
      storedAdvice: { status: "ready", answer: storedAnswer, attempts: 1 },
      providerError: new Error("Offline outage fixture"),
      env: { SUPABASE_URL: "https://yudtbifopfnjtjanaqrd.supabase.co" },
    });
    const response = await handler(request(JSON.stringify({ location: "Offline fixture" })));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer: storedAnswer, already_used: true });
    expect(providerFetch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    [{ status: "failed", attempts: 3 }, 429, "ADVICE_FAILURE_LIMIT"],
    [
      {
        status: "pending",
        attempts: 1,
        lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      409,
      "ADVICE_IN_PROGRESS",
    ],
  ] as const)(
    "honors a stored quota/lease before provider work: %j",
    async (storedAdvice, status, code) => {
      const { handler, providerFetch, rpc } = loadHandler("zapruda-daily-advice", "", {
        storedAdvice,
      });
      const response = await handler(request(JSON.stringify({ location: "Offline fixture" })));
      expect(response.status).toBe(status);
      expect((await response.json()).code).toBe(code);
      expect(providerFetch).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("diagnoses an invalid key without consuming a slot or disclosing provider content", async () => {
    const { handler, providerFetch, rpc } = loadHandler(
      "zapruda-daily-advice",
      JSON.stringify({ error: "PRIVATE_PROVIDER_ID" }),
      {
        providerStatus: 401,
        env: {
          SUPABASE_URL: "https://yudtbifopfnjtjanaqrd.supabase.co",
          XAI_API_KEY: 'Bearer "offline-key-fixture"',
        },
      },
    );
    const response = await handler(request(JSON.stringify({ action: "diagnose" })));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      diagnostic_only: true,
      canGenerate: false,
      code: "XAI_INVALID_API_KEY",
      stage: "account",
      accountHttp: 401,
      key_normalized: true,
    });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|offline-key|Bearer/);
    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(providerFetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer offline-key-fixture",
    });
  });
  it("does not expose the diagnostic action outside STAGING", async () => {
    const { handler, providerFetch, rpc } = loadHandler("zapruda-daily-advice");
    expect((await handler(request(JSON.stringify({ action: "diagnose" })))).status).toBe(404);
    expect(providerFetch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
