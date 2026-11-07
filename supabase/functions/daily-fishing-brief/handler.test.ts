import { createDailyFishingBrief } from "./handler.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
const userA = "00000000-0000-4000-8000-000000000001";
const userB = "00000000-0000-4000-8000-000000000002";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
function fixture(
  options: {
    anonymous?: boolean;
    unconfirmed?: boolean;
    invalid?: boolean;
    preferencesError?: boolean;
    upstreamUnavailable?: boolean;
    rss?: string;
  } = {},
) {
  const calls: Array<{ path: string; authorization: string | null }> = [];
  const upstream: string[] = [];
  const backendFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const authorization = new Headers(init?.headers).get("Authorization");
    calls.push({ path: url.pathname + url.search, authorization });
    const token = authorization?.replace(/^Bearer /, "");
    const id = token === "unit-user-b" ? userB : userA;
    if (url.pathname === "/auth/v1/user") {
      if (options.invalid) return json({ message: "Invalid JWT" }, 401);
      return json({
        id,
        aud: "authenticated",
        role: "authenticated",
        email: "unit@example.invalid",
        created_at: "2026-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
        is_anonymous: options.anonymous ?? false,
        email_confirmed_at: options.unconfirmed ? null : "2026-01-01T00:00:00Z",
      });
    }
    if (url.pathname === "/rest/v1/angler_preferences") {
      // Model RLS: only the caller's own row can be returned. A missing forwarded
      // user token (the original defect) yields an empty result, never fake data.
      if (options.preferencesError) return json({ message: "Unavailable" }, 503);
      if (!["unit-user-a", "unit-user-b"].includes(token ?? "")) return json([]);
      equal(url.searchParams.get("user_id"), "eq." + id);
      return json([{ home_city: id === userA ? "Unit City" : "", home_region: "" }]);
    }
    throw new Error("Unexpected backend endpoint: " + url.pathname);
  };
  const upstreamFetch: typeof fetch = async (input) => {
    const url = String(input);
    upstream.push(url);
    if (options.upstreamUnavailable) throw new Error("Upstream offline");
    if (url.startsWith("https://news.google.com/")) {
      return new Response(options.rss ?? "<rss><channel></channel></rss>");
    }
    if (url.startsWith("https://geocoding-api.open-meteo.com/")) return json({ results: [] });
    throw new Error("Unexpected upstream endpoint");
  };
  const handler = createDailyFishingBrief({
    env: (key) =>
      (
        ({
          SUPABASE_URL: "https://unit.supabase.co",
          SUPABASE_ANON_KEY: "unit-anon-key",
        }) as Record<string, string>
      )[key],
    backendFetch,
    upstreamFetch,
  });
  const post = (authorization = "Bearer unit-user-a") =>
    handler(
      new Request("https://unit/brief", {
        method: "POST",
        headers: { Authorization: authorization },
      }),
    );
  return { handler, post, calls, upstream };
}

Deno.test("missing/malformed bearer is denied before backend or upstream access", async () => {
  const f = fixture();
  equal((await f.handler(new Request("https://unit/brief", { method: "POST" }))).status, 401);
  equal((await f.post("Basic unit-user-a")).status, 401);
  equal(f.calls, []);
  equal(f.upstream, []);
});
for (const options of [{ invalid: true }, { anonymous: true }, { unconfirmed: true }]) {
  Deno.test(
    "invalid, anonymous or unconfirmed identity cannot read preferences: " +
      JSON.stringify(options),
    async () => {
      const f = fixture(options);
      equal((await f.post()).status, options.unconfirmed ? 403 : 401);
      equal(f.calls.length, 1);
      equal(f.upstream, []);
    },
  );
}
Deno.test(
  "actual SDK forwards each caller JWT to RLS and does not reuse another user's preferences",
  async () => {
    const f = fixture();
    const first = await f.post();
    equal((await first.json()).city_configured, true);
    const second = await f.post("Bearer unit-user-b");
    equal((await second.json()).city_configured, false);
    equal(
      f.calls.filter((x) => x.path.startsWith("/rest/")).map((x) => x.authorization),
      ["Bearer unit-user-a", "Bearer unit-user-b"],
    );
    equal(first.headers.get("Cache-Control"), "private, no-store");
    equal(second.headers.get("Vary"), "Authorization");
    equal(f.upstream.filter((x) => x.includes("geocoding-api")).length, 1);
  },
);
Deno.test(
  "database errors are explicit and never presented as a missing-city success",
  async () => {
    const f = fixture({ preferencesError: true });
    equal((await f.post()).status, 503);
    equal(f.upstream, []);
  },
);
Deno.test("provider outage yields honest empty news/weather without invented content", async () => {
  const f = fixture({ upstreamUnavailable: true });
  const response = await f.post(),
    body = await response.json();
  equal(response.status, 200);
  equal(body.news, []);
  equal(body.weather, null);
  equal(body.history, null);
  equal(body.city_configured, true);
});
Deno.test("news rejects stale, future-dated and non-HTTPS evidence", async () => {
  const now = Date.now();
  const item = (date: number, url: string) =>
    `<item><title>Unit source item</title><link>${url}</link><pubDate>${new Date(date).toUTCString()}</pubDate><source>Unit source</source></item>`;
  const f = fixture({
    rss:
      "<rss>" +
      item(now - 3600000, "https://example.invalid/current") +
      item(now - 10 * 86400000, "https://example.invalid/stale") +
      item(now + 86400000, "https://example.invalid/future") +
      item(now - 3600000, "http://example.invalid/plain") +
      "</rss>",
  });
  const body = await (await f.post()).json();
  equal(body.news.length, 1);
  equal(body.news[0].url, "https://example.invalid/current");
});
Deno.test("preflight and method rejection never query private data", async () => {
  const f = fixture();
  equal((await f.handler(new Request("https://unit/brief", { method: "OPTIONS" }))).status, 204);
  equal((await f.handler(new Request("https://unit/brief"))).status, 405);
  equal(f.calls, []);
  equal(f.upstream, []);
});
