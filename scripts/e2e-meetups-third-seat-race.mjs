// v0.7.1 STAGING ONLY: independent JWT race for the third meetup seat.
// Needs four disposable verified STAGING users; leaves fixture for audited cleanup.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error("Missing protected setting: " + name);
  return value;
}
const url = required("ZAPRUDA_E2E_STAGING_URL");
assert.equal(new URL(url).origin, "https://yudtbifopfnjtjanaqrd.supabase.co", "STAGING only");
const key = required("ZAPRUDA_E2E_PUBLISHABLE_KEY");
assert.ok(key.startsWith("sb_publishable_"));
const roles = ["OWNER", "SEATED", "RACER_A", "RACER_B"];
const accounts = [];
for (const role of roles) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: required("ZAPRUDA_E2E_" + role + "_EMAIL"),
    password: required("ZAPRUDA_E2E_" + role + "_PASSWORD"),
  });
  if (error) throw error;
  assert.ok(data.session?.access_token, role + ": missing JWT");
  accounts.push({ client, userId: data.user.id });
}
assert.equal(new Set(accounts.map((a) => a.userId)).size, 4, "Four distinct users required");
const [owner, seated, racerA, racerB] = accounts;
const label = "QA_MEETUP_RACE_" + Date.now();
const { data: post, error: createError } = await owner.client
  .from("meetup_posts")
  .insert({
    owner_id: owner.userId,
    country_code: "SE",
    region_code: "QA",
    city_code: "QA",
    title: label,
    description: "Disposable concurrent third-seat test",
  })
  .select("id")
  .single();
if (createError) throw createError;
const id = post.id;
console.log("STAGING QA fixture created:", id, "- cleanup required");
for (const person of [seated, racerA, racerB]) {
  const { error } = await person.client
    .from("meetup_members")
    .insert({ post_id: id, user_id: person.userId, role: "participant", status: "pending" });
  if (error) throw error;
}
const { error: seatError } = await owner.client
  .from("meetup_members")
  .update({ status: "accepted" })
  .eq("post_id", id)
  .eq("user_id", seated.userId);
if (seatError) throw seatError;
// Two independently dispatched REST requests race for the single remaining slot.
const attempts = await Promise.all(
  [racerA, racerB].map((person) =>
    owner.client
      .from("meetup_members")
      .update({ status: "accepted" })
      .eq("post_id", id)
      .eq("user_id", person.userId)
      .select("user_id,status")
      .single(),
  ),
);
const successes = attempts.filter((x) => !x.error);
const failures = attempts.filter((x) => x.error);
assert.equal(successes.length, 1, "Exactly one third-seat candidate must succeed");
assert.equal(failures.length, 1, "Other candidate must be rejected");
assert.match(failures[0].error.message, /MEETUP_FULL/, "Expected capacity rejection");
const { data: members, error: inspectError } = await owner.client
  .from("meetup_members")
  .select("user_id,status")
  .eq("post_id", id);
if (inspectError) throw inspectError;
const accepted = members.filter((x) => x.status === "accepted");
assert.equal(accepted.length, 3, "Capacity exceeded");
assert.deepEqual(
  new Set(accepted.map((x) => x.user_id)),
  new Set([owner.userId, seated.userId, successes[0].data.user_id]),
);
console.log("PASS: 4 independent JWT, simultaneous requests, exactly 3 accepted; one MEETUP_FULL.");
console.log("Fixture", id, "remains for QA cleanup.");
for (const { client } of accounts) await client.auth.signOut();
