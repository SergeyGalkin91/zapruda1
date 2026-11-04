// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it } from "vitest";
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001";
const challenger = "00000000-0000-4000-8000-000000000002";
const moderator = "00000000-0000-4000-8000-000000000003";
const subscriber = "00000000-0000-4000-8000-000000000004";
const spot = "10000000-0000-4000-8000-000000000001";
const first = "20000000-0000-4000-8000-000000000001";
const second = "20000000-0000-4000-8000-000000000002";
const files = [
  "tests/unit/spot_bootstrap.sql",
  "staging/DRAFT_v075_spot_records_security_review.sql",
  "staging/DRAFT_v075_private_evidence_bucket.sql",
  "staging/DRAFT_v075_evidence_storage_gate.sql",
  "staging/DRAFT_v075_spot_end_to_end.sql",
  "staging/DRAFT_v075_spot_evidence_view.sql",
  "staging/v075_spot_scoped_subscriptions_no_self_review.sql",
  "staging/v075_spot_predecessor_notification_race_guard.sql",
  "staging/v075_spot_revocation_recalculation.sql",
];
async function act(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('test.user_id',$1,true)", [id]);
}
async function review(id: string) {
  await act(moderator);
  await db.exec("set local role authenticated");
  const result = await db.query<{ result: Record<string, unknown> }>(
    "select public.zc_spot_review($1,'verified',true,false,false) as result",
    [id],
  );
  await db.exec("reset role");
  return result;
}
async function revoke(id: string) {
  await act(moderator);
  await db.exec("set local role authenticated");
  const result = await db.query<{ result: Record<string, unknown> }>(
    "select public.zc_spot_revoke($1,'Independent test-only review reason') as result",
    [id],
  );
  await db.exec("reset role");
  return result;
}
beforeAll(async () => {
  db = await PGlite.create();
  for (const f of files) await db.exec(readFileSync("supabase/" + f, "utf8"));
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
  await db.query("insert into zc_spot_internal.moderators(user_id) values($1)", [moderator]);
  await db.query(
    "insert into public.zc_public_spots(id,name,city,region,waterbody_name,disciplines,state,reviewed_at) values($1,'ISOLATED SQL FIXTURE','Fixture','Fixture','Fixture',array['street','ultralight'],'approved',now())",
    [spot],
  );
  await db.query(
    "insert into public.zc_spot_subscriptions(user_id,spot_id,league) values($1,$2,'street')",
    [subscriber, spot],
  );
  for (const [id, user, weight, length] of [
    [first, owner, 1000, 400],
    [second, challenger, 1500, 600],
  ]) {
    await db.query(
      "insert into zc_spot_internal.catches(id,owner_id,league,method,species_id,weight_g,length_mm,captured_at) values($1,$2,'street','shore-spinning','pike',$3,$4,now())",
      [id, user, weight, length],
    );
    await db.query(
      "insert into zc_spot_internal.capture_scopes(catch_id,scope_type,scope_id) values($1,'spot',$2)",
      [id, spot],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('zc-spot-evidence-staging',$1)",
      [id],
    );
    await db.query(
      "insert into zc_spot_internal.evidence(catch_id,private_storage_key,evidence_kind) values($1::uuid,$1::text,'photo')",
      [id],
    );
  }
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  if (db) await db.close();
});
describe("SPOT moderation/revocation on isolated PostgreSQL (not real-JWT E2E)", () => {
  it("crowns only reviewed catches and restores the eligible predecessor", async () => {
    await review(first);
    await review(second);
    expect(
      (await db.query("select distinct catch_id from zc_spot_internal.title_holders")).rows,
    ).toEqual([{ catch_id: second }]);
    const result = await revoke(second);
    expect(result.rows[0]?.result).toMatchObject({ decision: "revoked", titles_changed: 2 });
    expect(
      (await db.query("select distinct catch_id from zc_spot_internal.title_holders")).rows,
    ).toEqual([{ catch_id: first }]);
  });
  it("removes the final crown and records an empty winner explicitly", async () => {
    await review(first);
    await revoke(first);
    expect((await db.query("select * from zc_spot_internal.title_holders")).rows).toEqual([]);
    expect(
      (
        await db.query(
          "select id from zc_spot_internal.title_history where new_catch_id is null and new_score is null",
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("does not duplicate review/revocation events on retries", async () => {
    await review(first);
    const repeated = await review(first);
    expect(repeated.rows[0]?.result).toMatchObject({ already_reviewed: true, titles_changed: 0 });
    await revoke(first);
    const before = (await db.query("select count(*) as n from public.zc_spot_notifications")).rows;
    expect((await revoke(first)).rows[0]?.result).toMatchObject({
      already_reviewed: true,
      titles_changed: 0,
    });
    expect((await db.query("select count(*) as n from public.zc_spot_notifications")).rows).toEqual(
      before,
    );
  });
  it("keeps a distinct revocation notification when a previous winner returns", async () => {
    await review(first);
    await review(second);
    await revoke(second);
    expect(
      (
        await db.query(
          "select event_key from public.zc_spot_notifications where user_id=$1 and event_key like '%catch_revoked%'",
          [subscriber],
        )
      ).rows,
    ).toHaveLength(2);
    expect(
      (
        await db.query(
          "select id from public.zc_spot_notifications where user_id=$1 and catch_id=$2",
          [subscriber, first],
        )
      ).rows,
    ).toHaveLength(4);
  });
  it("rejects an ordinary user's revocation before any state change", async () => {
    await review(first);
    await act(owner);
    await expect(
      db.query("select public.zc_spot_revoke($1,'Not an authorized moderator')", [first]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("prevents self-review even for an appointed moderator", async () => {
    await db.query("insert into zc_spot_internal.moderators(user_id) values($1)", [owner]);
    await act(owner);
    await expect(
      db.query("select public.zc_spot_review($1,'verified',true,false,false)", [first]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("does not restore a predecessor whose evidence is no longer available", async () => {
    await review(first);
    await review(second);
    await db.query("update storage.objects set is_delete_marker=true where name=$1", [first]);
    await revoke(second);
    expect((await db.query("select * from zc_spot_internal.title_holders")).rows).toEqual([]);
  });
});
