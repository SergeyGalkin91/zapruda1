/**
 * STAGING real-JWT SPOT preflight. READ-ONLY: creates no public spots, catches, or kings.
 * Requires four distinct confirmed users and GitHub staging-e2e protected secrets.
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.ZAPRUDA_E2E_STAGING_URL;
const KEY = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const pairs = ["OWNER", "SEATED", "RACER_A", "RACER_B"];
const credentials = pairs.map((name) => ({
  label: name,
  email: process.env[`ZAPRUDA_E2E_${name}_EMAIL`],
  password: process.env[`ZAPRUDA_E2E_${name}_PASSWORD`],
}));

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function invoke(token, action, extra = {}) {
  const response = await fetch(`${URL}/functions/v1/zapruda-spot-records`, {
    method: "POST",
    headers: {
      apikey: KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, ...extra }),
    signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, data: await response.json() };
}

async function main() {
  ensure(
    URL === "https://yudtbifopfnjtjanaqrd.supabase.co",
    "Refusing to run SPOT E2E against a non-STAGING Supabase URL",
  );
  ensure(KEY && credentials.every((c) => c.email && c.password), "Protected E2E secrets missing");
  ensure(
    new Set(credentials.map((c) => c.email.toLowerCase())).size === 4,
    "Four distinct STAGING test accounts are required",
  );

  const users = [];
  for (const { label, email, password } of credentials) {
    const client = createClient(URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    ensure(!error && data?.session?.access_token, `${label}: real login failed`);
    const { data: lookedUp, error: userError } = await client.auth.getUser(
      data.session.access_token,
    );
    ensure(!userError && lookedUp?.user?.email_confirmed_at, `${label}: email unconfirmed`);
    users.push({ label, id: lookedUp.user.id, token: data.session.access_token, client });
  }
  ensure(new Set(users.map((u) => u.id)).size === 4, "Distinct account email mapped to same user");

  const unauthenticated = await fetch(`${URL}/functions/v1/zapruda-spot-records`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ action: "mine" }),
    signal: AbortSignal.timeout(20000),
  });
  ensure(unauthenticated.status === 401, "Unauthenticated SPOT endpoint did not return HTTP 401");
  console.log("PASS anonymous Edge access denied");

  for (const user of users) {
    const mine = await invoke(user.token, "mine");
    ensure(mine.status === 200 && Array.isArray(mine.data.catches), `${user.label}: my catches denied`);
    const inbox = await invoke(user.token, "inbox");
    ensure(
      inbox.status === 200 && Array.isArray(inbox.data.notifications),
      `${user.label}: own inbox inaccessible`,
    );
    console.log(`PASS ${user.label} confirmed JWT, own catches and inbox`);
  }

  // RACER_B must remain an ordinary user, not a privileged SPOT moderator.
  const ordinary = users.find((u) => u.label === "RACER_B");
  const queue = await invoke(ordinary.token, "queue");
  ensure(queue.status === 403, "Ordinary test user can read moderation queue");
  const evidence = await invoke(ordinary.token, "evidence", {
    catch_id: "00000000-0000-4000-8000-000000000001",
  });
  ensure(evidence.status === 403, "Ordinary test user could request private evidence");
  const fakeReview = await invoke(ordinary.token, "review", {
    catch_id: "00000000-0000-4000-8000-000000000001",
    decision: "verified",
    lawful: true,
  });
  ensure(fakeReview.status === 403, "Ordinary test user could call moderator review");
  console.log("PASS non-moderator queue, evidence and review rejected");

  const invalidSpot = await ordinary.client.rpc("zc_spot_public_leaderboard", {
    p_spot_id: "00000000-0000-4000-8000-000000000001",
    p_league: "street",
  });
  ensure(invalidSpot.error, "Unapproved spot accepted by public leaderboard");
  console.log("PASS unknown/unapproved spot blocked");

  for (const u of users) await u.client.auth.signOut();
  console.log("PASS 4-user live JWT read-only SPOT preflight");
  console.log("NOT TESTED: real photo upload, authenticated moderator, award or notification delivery");
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : "SPOT E2E failed"}`);
  process.exitCode = 1;
});
