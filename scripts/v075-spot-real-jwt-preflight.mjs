/**
 * v0.7.5 SPOT real-JWT STAGING preflight.
 * Read-only: never creates a moderator, approved spot, catch, title or media.
 * Credentials are supplied exclusively through protected environment secrets.
 */
import assert from "node:assert/strict";

const STAGING_URL = "https://yudtbifopfnjtjanaqrd.supabase.co";
const base = process.env.ZAPRUDA_E2E_STAGING_URL;
const apiKey = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const roleNames = ["RACER_A", "RACER_B", "MODERATOR", "SUBSCRIBER"];

function requireValue(name) {
  const value = process.env[name];
  if (!value) throw new Error("Missing protected configuration: " + name);
  return value;
}

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      apikey: apiKey,
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Failed payloads are never printed: they could contain private data.
  }
  return { status: response.status, data };
}

async function login(role) {
  const email = requireValue("ZAPRUDA_SPOT_" + role + "_EMAIL");
  const password = requireValue("ZAPRUDA_SPOT_" + role + "_PASSWORD");
  const result = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(result.status, 200, role + " login rejected");
  const token = result.data?.access_token;
  assert.ok(typeof token === "string" && token.length > 30, role + " lacks token");
  const user = await request("/auth/v1/user", { token });
  assert.equal(user.status, 200, role + " account lookup failed");
  assert.ok(user.data?.id, role + " has no identity");
  assert.ok(user.data?.email_confirmed_at, role + " email not confirmed");
  return { id: user.data.id, token };
}

async function edge(token, action, params = {}) {
  return request("/functions/v1/zapruda-spot-records", {
    method: "POST",
    token,
    body: { action, ...params },
  });
}

async function main() {
  assert.equal(base, STAGING_URL, "Only the designated STAGING project is allowed");
  requireValue("ZAPRUDA_E2E_PUBLISHABLE_KEY");
  const roles = {};
  for (const role of roleNames) {
    roles[role] = await login(role);
    process.stdout.write("Validated confirmed role: " + role + "\n");
  }
  assert.equal(new Set(roleNames.map((name) => roles[name].id)).size, 4,
    "Four distinct authenticated users required");

  const anonymous = await request("/functions/v1/zapruda-spot-records", {
    method: "POST",
    body: { action: "queue" },
  });
  assert.ok([401, 403].includes(anonymous.status), "Unauthenticated queue must be denied");

  for (const role of ["RACER_A", "RACER_B", "SUBSCRIBER"]) {
    const queue = await edge(roles[role].token, "queue");
    assert.equal(queue.status, 403, role + " must not access moderator queue");
    const own = await edge(roles[role].token, "mine");
    assert.equal(own.status, 200, role + " cannot read own catches");
    assert.ok(Array.isArray(own.data?.catches), role + " catches response not an array");
    const inbox = await edge(roles[role].token, "inbox");
    assert.equal(inbox.status, 200, role + " cannot read own inbox");
    assert.ok(Array.isArray(inbox.data?.notifications), role + " inbox malformed");
  }
  const moderatorQueue = await edge(roles.MODERATOR.token, "queue");
  assert.equal(moderatorQueue.status, 200, "Designated moderator lacks server-side role");
  assert.ok(Array.isArray(moderatorQueue.data?.queue), "Moderator queue malformed");

  const spots = await request(
    "/rest/v1/zc_public_spots?select=id,disciplines,state,reviewed_at&state=eq.approved&limit=100",
    { token: roles.RACER_A.token },
  );
  assert.equal(spots.status, 200, "Approved public catalog unavailable");
  const approved = Array.isArray(spots.data)
    ? spots.data.filter((spot) =>
        spot.reviewed_at && spot.disciplines?.some((league) =>
          league === "street" || league === "ultralight"))
    : [];
  assert.ok(approved.length > 0, "No vetted pilot spot: live upload is blocked");
  process.stdout.write(
    "PASS: four real JWTs, moderator authorization, account isolation, and vetted spots (" +
      approved.length + ").\n",
  );
  process.stdout.write("Read-only preflight; no fish, titles or media created.\n");
}

main().catch((error) => {
  process.stderr.write("SPOT JWT E2E BLOCKED/FAILED: " + error.message + "\n");
  process.exitCode = 1;
});
