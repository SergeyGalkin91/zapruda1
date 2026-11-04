// Real-JWT STAGING REST smoke test. Run only against a disposable QA club.
// Required: STAGING_URL, STAGING_PUBLISHABLE_KEY, OWNER_JWT, INVITEE_JWT, QA_CLUB_ID.
// Does not create club/payment or persist tokens; membership and QA message remain for manual cleanup.
import assert from "node:assert/strict";
const env = process.env;
const url = env.STAGING_URL?.replace(/\/$/, "");
assert.equal(url, "https://yudtbifopfnjtjanaqrd.supabase.co", "Only approved STAGING allowed");
for (const k of ["STAGING_PUBLISHABLE_KEY", "OWNER_JWT", "INVITEE_JWT", "QA_CLUB_ID"])
  assert.ok(env[k], k + " required");
assert.ok(env.STAGING_PUBLISHABLE_KEY.startsWith("sb_publishable_"), "Must use public key");
const base = { apikey: env.STAGING_PUBLISHABLE_KEY, "Content-Type": "application/json" };
async function request(path, token, method = "GET", data) {
  const response = await fetch(url + path, {
    method,
    headers: { ...base, Authorization: "Bearer " + token, Prefer: "return=representation" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  return { status: response.status, ok: response.ok, body: parsed };
}
async function must(result, context) {
  assert.equal(
    result.ok,
    true,
    context + ": HTTP " + result.status + " " + JSON.stringify(result.body).slice(0, 250),
  );
  return result.body;
}
const owner = (await must(await request("/auth/v1/user", env.OWNER_JWT), "Owner JWT")).id;
const invitee = (await must(await request("/auth/v1/user", env.INVITEE_JWT), "Invitee JWT")).id;
assert.notEqual(owner, invitee, "Two independent user sessions required");
const group = await must(
  await request(
    "/rest/v1/social_groups?id=eq." +
      encodeURIComponent(env.QA_CLUB_ID) +
      "&select=id,owner_id,name",
    env.OWNER_JWT,
  ),
  "QA club visible",
);
assert.equal(group.length, 1, "QA club missing");
assert.equal(group[0].owner_id, owner, "Owner mismatch");
assert.ok(group[0].name.startsWith("QA_"), "Only explicitly named disposable QA club");
const join = await must(
  await request("/rest/v1/social_group_members", env.OWNER_JWT, "POST", {
    group_id: env.QA_CLUB_ID,
    user_id: invitee,
    invited_by: owner,
    role: "member",
    status: "pending",
  }),
  "Owner invitation",
);
assert.equal(join[0]?.status, "pending");
const outsiderBefore = await must(
  await request(
    "/rest/v1/social_group_messages?group_id=eq." + env.QA_CLUB_ID + "&select=id",
    env.INVITEE_JWT,
  ),
  "Pending user chat read",
);
assert.equal(outsiderBefore.length, 0, "Pending invitation must not grant chat access");
const acceptance = await must(
  await request(
    "/rest/v1/social_group_members?group_id=eq." + env.QA_CLUB_ID + "&user_id=eq." + invitee,
    env.INVITEE_JWT,
    "PATCH",
    { status: "accepted" },
  ),
  "Invitee acceptance",
);
assert.equal(acceptance.length, 1, "Acceptance failed");
assert.equal(acceptance[0].status, "accepted");
const msg = await must(
  await request("/rest/v1/social_group_messages", env.INVITEE_JWT, "POST", {
    group_id: env.QA_CLUB_ID,
    user_id: invitee,
    body: "QA API JWT two-user test",
  }),
  "Accepted member message",
);
assert.equal(msg.length, 1, "Message missing");
const read = await must(
  await request(
    "/rest/v1/social_group_messages?group_id=eq." + env.QA_CLUB_ID + "&select=id,body",
    env.OWNER_JWT,
  ),
  "Owner chat read",
);
assert.ok(
  read.some((x) => x.id === msg[0].id),
  "Owner cannot read accepted member message",
);
console.log(
  "PASS: two real JWTs, owner invite, pending isolation, accept, write/read chat. QA artifacts remain for cleanup.",
);
