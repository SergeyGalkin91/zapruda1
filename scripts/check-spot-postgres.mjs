/**
 * Real independent PostgreSQL transactions; disconnected synthetic SQL identities.
 * NOT a Supabase signed-JWT/photo/legal-spot E2E. Refuses every hosted database.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const connection = process.env.SPOT_SQL_TEST_DATABASE_URL ?? "";
const parsed = new URL(connection);
assert.equal(parsed.hostname, "127.0.0.1");
assert.equal(parsed.pathname, "/spot_sql_unit");
assert.equal(process.env.CI, "true");
const users = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
];
const [owner, challenger, moderator, subscriber] = users;
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
async function sql(text) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "psql",
      [
        "-X",
        "--no-psqlrc",
        "--quiet",
        "--tuples-only",
        "--no-align",
        "--set",
        "ON_ERROR_STOP=1",
        "--dbname",
        connection,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "",
      err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err.slice(0, 1200))),
    );
    child.stdin.end("set statement_timeout='20s'; set lock_timeout='10s';\n" + text);
  });
}
const scalar = async (text) => JSON.parse((await sql(text)).split("\n").at(-1));
const asUser = (uid, text) =>
  "begin; select set_config('test.user_id'," +
  quote(uid) +
  ",true); set local role authenticated; " +
  text +
  "; commit;";
const approve = (id) =>
  sql(
    asUser(
      moderator,
      "select public.zc_spot_review(" + quote(id) + ",'verified',true,false,false)",
    ),
  );
const revoke = (id) =>
  sql(
    asUser(
      moderator,
      "select public.zc_spot_revoke(" + quote(id) + ",'Isolated concurrency review reason')",
    ),
  );
const ids = () => Array.from({ length: 5 }, () => randomUUID());
const cases = [];
const files = JSON.parse(readFileSync("supabase/tests/unit/spot-sql-files.json", "utf8"));
await sql(files.map((name) => readFileSync("supabase/" + name, "utf8")).join("\n"));
await sql("insert into zc_spot_internal.moderators(user_id) values(" + quote(moderator) + ");");
for (let round = 0; round < 5; round++) {
  const [spot, a, b, c, d] = ids();
  await sql(
    [
      "insert into public.zc_public_spots(id,name,city,region,waterbody_name,disciplines,state,reviewed_at) values(" +
        quote(spot) +
        ",'ISOLATED SQL FIXTURE','Fixture','Fixture','Fixture',array['street','ultralight'],'approved',now())",
      "insert into public.zc_spot_subscriptions(user_id,spot_id,league) values(" +
        quote(subscriber) +
        "," +
        quote(spot) +
        ",'street'),(" +
        quote(moderator) +
        "," +
        quote(spot) +
        ",'ultralight')",
      ...[
        [a, owner, 1000, 400],
        [b, challenger, 1200, 500],
        [c, owner, 1500, 700],
        [d, challenger, 1400, 600],
      ].flatMap(([id, uid, weight, length]) => [
        "insert into zc_spot_internal.catches(id,owner_id,league,method,species_id,weight_g,length_mm,captured_at) values(" +
          quote(id) +
          "," +
          quote(uid) +
          ",'street','shore-spinning','pike'," +
          weight +
          "," +
          length +
          ",now())",
        "insert into zc_spot_internal.capture_scopes(catch_id,scope_type,scope_id) values(" +
          quote(id) +
          ",'spot'," +
          quote(spot) +
          ")",
        "insert into storage.objects(bucket_id,name) values('zc-spot-evidence-staging'," +
          quote(id) +
          ")",
        "insert into zc_spot_internal.evidence(catch_id,private_storage_key,evidence_kind) values(" +
          quote(id) +
          "," +
          quote(id) +
          ",'photo')",
      ]),
    ].join(";\n") + ";",
  );
  await approve(a);
  await Promise.all([approve(b), approve(c)]);
  const holders = () =>
    scalar(
      "select coalesce(json_agg(h.catch_id order by h.category_id),'[]') from zc_spot_internal.title_holders h join zc_spot_internal.categories k on k.id=h.category_id where k.scope_id=" +
        quote(spot),
    );
  assert.deepEqual(await holders(), [c, c], "Largest verified challenger must hold both crowns");
  await Promise.all([revoke(c), approve(d)]);
  assert.deepEqual(
    await holders(),
    [d, d],
    "Revocation racing with approval must select the eligible maximum",
  );
  const historyBefore = await scalar(
    "select count(*) from zc_spot_internal.moderation_events where catch_id=" + quote(c),
  );
  await revoke(c);
  assert.equal(
    await scalar(
      "select count(*) from zc_spot_internal.moderation_events where catch_id=" + quote(c),
    ),
    historyBefore,
  );
  await revoke(d);
  assert.deepEqual(await holders(), [b, b]);
  await revoke(b);
  assert.deepEqual(await holders(), [a, a]);
  await revoke(a);
  assert.deepEqual(await holders(), []);
  assert.equal(
    await scalar(
      "select count(*) from public.zc_spot_notifications n join zc_spot_internal.categories k on k.id=n.category_id where k.scope_id=" +
        quote(spot) +
        " and n.user_id=" +
        quote(moderator),
    ),
    0,
    "Wrong-league subscriber must receive no STREET notification",
  );
  const eventCount = await scalar(
    "select count(*) from public.zc_spot_notifications n join zc_spot_internal.categories k on k.id=n.category_id where k.scope_id=" +
      quote(spot) +
      " and n.user_id=" +
      quote(subscriber) +
      " and n.event_key like '%catch_revoked%'",
  );
  assert.equal(eventCount, 8, "Each crown revocation gets a distinct idempotent subscriber event");
  await assert.rejects(
    sql(
      asUser(
        owner,
        "select public.zc_spot_revoke(" + quote(a) + ",'Unauthorized test-only review reason')",
      ),
    ),
    /Moderator access required/,
  );
  cases.push({
    round: round + 1,
    concurrentApproval: true,
    concurrentRevocation: true,
    retries: true,
    emptyFinalCrown: true,
    notificationScope: true,
  });
}
mkdirSync("qa", { recursive: true });
writeFileSync(
  "qa/spot-postgres.json",
  JSON.stringify(
    {
      database: "isolated PostgreSQL 17",
      authentication: "synthetic SQL identities; NOT signed JWT",
      publicAppFixtures: 0,
      cases,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "PASS: five real multi-session PostgreSQL races, revocation/re-election, retry idempotency and scoped notifications",
);
