import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type EdgeHandler = (request: Request) => Promise<Response>;
type FunctionName = "openweather-current" | "zapruda-daily-advice";
type HandlerOptions = {
  providerStatus?: number;
  providerError?: Error;
  anonymous?: boolean;
  authError?: boolean;
  rpc?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
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
        data: { user: { id: "offline-unit-user", is_anonymous: options.anonymous ?? false } },
        error: options.authError ? { message: "Offline invalid token fixture" } : null,
      })),
    },
    rpc,
  };
  const providerFetch = vi.fn(async () => {
    if (options.providerError) throw options.providerError;
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
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
    Deno: {
      env: { get: () => "offline-test-placeholder" },
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
});
