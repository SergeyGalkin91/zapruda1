/** Disposable PostgreSQL 17, separate SQL sessions. No real JWTs or hosted data. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { checkCommunityBoundaries } from "./check-community-postgres.mjs";
const connection = process.env.PILOT_SQL_TEST_DATABASE_URL ?? "";
const parsed = new URL(connection);
assert.equal(parsed.hostname, "127.0.0.1");
assert.equal(parsed.pathname, "/pilot_schema_unit");
assert.equal(process.env.CI, "true");
const owner = "00000000-0000-4000-8000-000000000001";
const outsider = "00000000-0000-4000-8000-000000000003";
const q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
async function sql(source) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [
      "-X",
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--dbname",
      connection,
    ]);
    let out = "",
      err = "";
    child.stdout.on("data", (v) => {
      out += v;
    });
    child.stderr.on("data", (v) => {
      err += v;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err.slice(0, 1500))),
    );
    child.stdin.end("set statement_timeout='20s'; set lock_timeout='10s';\n" + source);
  });
}
const file = (path) => readFileSync("supabase/" + path, "utf8");
const asUser = (uid, text) =>
  "begin; select set_config('test.user_id'," +
  q(uid) +
  ",true); set local role authenticated; " +
  text +
  "; commit;";
const scalar = async (source) => {
  const value = (await sql(source)).split("\n").at(-1);
  // psql's unaligned booleans are t/f; numeric and JSON results remain JSON.
  return value === "t" ? true : value === "f" ? false : JSON.parse(value);
};
const deltas = [
  "v075_report_integrity.sql",
  "v075_public_chat.sql",
  "v075_private_gear_marks.sql",
  "v075_profile_progress.sql",
  "v075_pilot_realtime.sql",
  "v075_trip_matching_fields.sql",
  "v075_pilot_access_indexes.sql",
];
await sql(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create table public.profiles(id uuid primary key references auth.users(id));
 create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('test.user_id',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to authenticated,service_role;
 insert into auth.users values(${q(owner)}),(${q(outsider)});
 insert into public.profiles select id from auth.users;
 create publication supabase_realtime;
`);
await sql(
  [
    "tests/unit/pilot_dependencies_context.sql",
    "tests/unit/report_dependencies_adopted.sql",
    "tests/unit/chat_dependencies_adopted.sql",
    "tests/unit/gear_dependencies_adopted.sql",
    ...deltas.map((d) => "staging/" + d),
  ]
    .map(file)
    .join("\n"),
);
// Revert/reapply the actual deltas, preserving the pre-existing text chat and ACL.
await sql(file("staging/rollback_v075_pilot_schema.sql"));
await sql(deltas.map((d) => file("staging/" + d)).join("\n"));
await sql(file("tests/unit/subsequent_dependencies_adopted.sql"));
await sql(file("staging/v075_feedback_atomic_limits.sql"));
const feedbackRaces = [];
const feedbackCall =
  "select public.submit_community_request_v075(" +
  q(owner) +
  ",'bug','','SQL fixture','Disposable technical feedback','')";
for (let round = 0; round < 5; round++) {
  // Only this script's disposable localhost database; never a hosted quota reset.
  await sql("delete from public.community_requests");
  const attempts = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      sql("begin; set local role service_role; " + feedbackCall + "; commit;"),
    ),
  );
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 5);
  const refused = attempts.filter((r) => r.status === "rejected");
  assert.equal(refused.length, 1);
  assert.match(String(refused[0].reason), /FEEDBACK_RATE_LIMITED/);
  assert.equal(await scalar("select count(*) from public.community_requests"), 5);
  feedbackRaces.push({ round, attempts: 6, saved: 5, rateLimited: 1 });
}
await sql(
  "delete from public.community_requests; insert into public.community_requests(user_id,request_type,subject,body,created_at) select " +
    q(owner) +
    ",'bug','SQL fixture','Disposable technical feedback',now()-interval '2 hours' from generate_series(1,15)",
);
await assert.rejects(
  sql("begin; set local role service_role; " + feedbackCall + "; commit;"),
  /FEEDBACK_RATE_LIMITED/,
);
await sql(file("staging/rollback_v075_feedback_atomic_limits.sql"));
assert.equal(await scalar("select count(*) from public.community_requests"), 15);
await sql(file("staging/v075_feedback_atomic_limits.sql"));
const cases = [];
for (let round = 0; round < 5; round++) {
  const report = randomUUID();
  const values = { title: "Isolated SQL transaction", is_public: false };
  const fish = [{ species: "SQL fixture", weight_kg: 1 }];
  const call =
    "select publish_report_with_catches(" +
    q(report) +
    "," +
    q(JSON.stringify(values)) +
    "::jsonb," +
    q(JSON.stringify(fish)) +
    "::jsonb)";
  await Promise.all(Array.from({ length: 4 }, () => sql(asUser(owner, call))));
  assert.equal(
    await scalar("select count(*) from public.fishing_reports where id=" + q(report)),
    1,
  );
  assert.equal(await scalar("select count(*) from public.catches where report_id=" + q(report)), 1);
  const bad = randomUUID();
  await assert.rejects(
    sql(
      asUser(
        owner,
        "select publish_report_with_catches(" +
          q(bad) +
          "," +
          q(JSON.stringify(values)) +
          '::jsonb,\'[{"species":"fixture","weight_kg":-1}]\'::jsonb)',
      ),
    ),
  );
  assert.equal(await scalar("select count(*) from public.fishing_reports where id=" + q(bad)), 0);
  // Two users and separate sessions must resolve the same normalized geographic row.
  const region = "Isolated region " + round;
  const [a, b] = await Promise.all(
    [owner, outsider].map((uid) =>
      sql(asUser(uid, "select ensure_chat_place('RU'," + q(region) + ",null)")),
    ),
  );
  assert.equal(a.split("\n").at(-1), b.split("\n").at(-1));
  cases.push({ round, atomicRetry: true, catchFailureRollback: true, geographicRace: true });
}
// Simultaneous primary-kit switches serialize per owner with one holder.
const rod = randomUUID(),
  reel = randomUUID(),
  a = randomUUID(),
  b = randomUUID();
await sql(
  "insert into public.angler_gear(id,user_id,gear_type,brand,model)values(" +
    q(rod) +
    "," +
    q(owner) +
    ",'rod','Fixture','Fixture'),(" +
    q(reel) +
    "," +
    q(owner) +
    ",'reel','Fixture','Fixture');" +
    "insert into public.angler_gear_sets(id,user_id,rod_id,reel_id)values(" +
    [q(a), q(owner), q(rod), q(reel)].join(",") +
    "),(" +
    [q(b), q(owner), q(rod), q(reel)].join(",") +
    ");",
);
await Promise.all(
  [a, b].map((id) => sql(asUser(owner, "select set_my_primary_gear_set(" + q(id) + ")"))),
);
assert.equal(
  await scalar(
    "select count(*)from public.angler_gear_sets where user_id=" + q(owner) + " and is_primary",
  ),
  1,
);
// Both refusal reasons are independent. The temporary policy DROP is inside
// an isolated transaction that psql rolls back on the expected error.
await assert.rejects(
  sql(
    "begin; drop policy staging_geo_messages_global_send on public.chat_messages;\n" +
      file("staging/rollback_v075_pilot_schema.sql"),
  ),
  /Rollback refused: preserve content/,
);
await assert.rejects(
  sql(file("staging/rollback_v075_pilot_schema.sql")),
  /subsequent global chat policy/,
);
mkdirSync("qa", { recursive: true });
const community = await checkCommunityBoundaries({ sql, scalar, asUser, q, file, owner, outsider });
writeFileSync(
  "qa/pilot-postgres.json",
  JSON.stringify(
    {
      engine: "PostgreSQL 17",
      hosted: false,
      signedJWT: false,
      emptyRollbackReapply: true,
      populatedRollbackRefused: true,
      subsequentRollbackRefused: true,
      onePrimaryKit: true,
      feedbackRaces,
      feedbackDailyLimit: true,
      feedbackRollbackPreservesRequests: true,
      cases,
      community,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: disposable PostgreSQL rollback/reapply, 5 rounds of independent publication/place races, primary-kit concurrency",
);
