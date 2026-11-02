import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type EdgeHandler = (request: Request) => Promise<Response>;
type FunctionName = "openweather-current" | "zapruda-daily-advice";

// Execute the actual handler source with only its Deno host and dependencies mocked.
// These tests use no real accounts, keys, JWTs, Supabase calls or provider requests.
function loadHandler(name: FunctionName, providerBody = "{}") {
  let handler: EdgeHandler | undefined;
  const rpc = vi.fn(async () => {
    throw new Error("Unexpected database call in input-validation test");
  });
  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "offline-unit-user", is_anonymous: false } },
        error: null,
      })),
    },
    rpc,
  };
  const providerFetch = vi.fn(async () => new Response(providerBody, { status: 200 }));
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

function request(body: string) {
  return new Request("https://offline-test.invalid", {
    method: "POST",
    headers: {
      Authorization: "Bearer offline-test-placeholder",
      "Content-Type": "application/json",
    },
    body,
  });
}

describe.each<FunctionName>(["openweather-current", "zapruda-daily-advice"])(
  "%s request validation (offline handler tests)",
  (name) => {
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
