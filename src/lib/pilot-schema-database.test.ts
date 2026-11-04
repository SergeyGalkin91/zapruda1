// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  actAsFixture,
  applySqlFile,
  createIsolatedPostgres,
  fixtureUsers as users,
} from "../test/isolated-postgres";

// Real SQL/RLS in an isolated engine; invented identities, NOT signed-JWT evidence.
const report = "10000000-0000-4000-8000-000000000071";
const other = "10000000-0000-4000-8000-000000000072";
const msg = "20000000-0000-4000-8000-000000000071";
const photo = "30000000-0000-4000-8000-000000000071";
const payload = { title: "Private SQL fixture", is_public: false, fishing_method: "spinning" };
const fish = [{ species: "SQL fixture", weight_kg: 1, length_cm: 10 }];
const deltas = [
  "v075_report_integrity.sql",
  "v075_public_chat.sql",
  "v075_private_gear_marks.sql",
  "v075_profile_progress.sql",
  "v075_pilot_realtime.sql",
  "v075_trip_matching_fields.sql",
  "v075_pilot_access_indexes.sql",
];
let db: PGlite;
async function baseline(includeSubsequent = true) {
  const engine = await createIsolatedPostgres();
  await engine.exec("create publication supabase_realtime");
  await applySqlFile(engine, "tests/unit/pilot_dependencies_context.sql");
  await applySqlFile(engine, "tests/unit/report_dependencies_adopted.sql");
  await applySqlFile(engine, "tests/unit/chat_dependencies_adopted.sql");
  await applySqlFile(engine, "tests/unit/gear_dependencies_adopted.sql");
  for (const delta of deltas) await applySqlFile(engine, "staging/" + delta);
  if (includeSubsequent)
    await applySqlFile(engine, "tests/unit/subsequent_dependencies_adopted.sql");
  return engine;
}
const publish = (id = report, catches = fish, values = payload) =>
  db.query("select public.publish_report_with_catches($1,$2::jsonb,$3::jsonb) id", [
    id,
    JSON.stringify(values),
    JSON.stringify(catches),
  ]);
async function denied(action: () => Promise<unknown>, code = "42501") {
  await db.exec("savepoint rejected_action");
  await expect(action()).rejects.toMatchObject({ code });
  await db.exec("rollback to savepoint rejected_action; release savepoint rejected_action");
}
async function addReport(id = report, owner = users.owner, isPublic = false) {
  await db.query(
    "insert into public.fishing_reports(id,user_id,title,is_public) values($1,$2,'SQL fixture',$3)",
    [id, owner, isPublic],
  );
}
beforeAll(async () => {
  db = await baseline();
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  if (db) await db.close();
});

describe("Pilot report transaction and inherited ACL (isolated SQL)", () => {
  it("commits report/catches together and retries the same request exactly once", async () => {
    await actAsFixture(db, users.owner);
    expect((await publish()).rows).toEqual([{ id: report }]);
    await publish();
    expect((await db.query("select id from public.catches")).rows).toHaveLength(1);
    await denied(() => publish(report, [{ ...fish[0]!, weight_kg: 2 }]), "22023");
  });
  it("rolls the report and retry journal back when a catch fails", async () => {
    await actAsFixture(db, users.owner);
    await denied(() => publish(report, [{ ...fish[0]!, weight_kg: -1 }]), "23514");
    expect((await db.query("select id from public.fishing_reports")).rows).toEqual([]);
    expect(
      (await db.query("select report_id from zapruda_internal.pilot_report_publications_v075"))
        .rows,
    ).toEqual([]);
  });
  it("rejects coordinates, foreign identities, empty batches and malformed catches", async () => {
    await actAsFixture(db, users.owner);
    await denied(
      () => publish(report, fish, { ...payload, latitude: 0 } as typeof payload),
      "22023",
    );
    await denied(() => publish(report, []), "22023");
    await denied(
      () =>
        db.query("select publish_report_with_catches($1,$2,'[null]'::jsonb)", [
          report,
          JSON.stringify(payload),
        ]),
      "22023",
    );
    await denied(
      () => publish(report, fish, { ...payload, user_id: users.outsider } as typeof payload),
      "22023",
    );
  });
  it("cannot attach an own catch to another person's report, even through a privileged insert", async () => {
    await addReport();
    await actAsFixture(db, users.outsider);
    await denied(() =>
      db.query(
        "insert into public.catches(report_id,user_id,species) values($1,$2,'SQL fixture')",
        [report, users.outsider],
      ),
    );
    await db.exec("reset role");
    await denied(
      () =>
        db.query(
          "insert into public.catches(report_id,user_id,species) values($1,$2,'SQL fixture')",
          [report, users.outsider],
        ),
      "23503",
    );
  });
  it("withdraws catch/comment reads when a public report becomes private", async () => {
    await actAsFixture(db, users.owner);
    await publish(report, fish, { ...payload, is_public: true });
    await actAsFixture(db, users.outsider);
    await db.query(
      "insert into public.comments(report_id,user_id,body) values($1,$2,'SQL fixture')",
      [report, users.outsider],
    );
    expect((await db.query("select id from public.catches")).rows).toHaveLength(1);
    await actAsFixture(db, users.owner);
    await db.query("update public.fishing_reports set is_public=false where id=$1", [report]);
    await actAsFixture(db, users.outsider);
    expect((await db.query("select id from public.catches")).rows).toEqual([]);
    expect((await db.query("select id from public.comments")).rows).toEqual([]);
    await denied(() =>
      db.query("insert into public.comments(report_id,user_id,body)values($1,$2,'SQL fixture')", [
        report,
        users.outsider,
      ]),
    );
  });
  it("does not inherit broad grants for originals, TRUNCATE, GPS or guest writes", async () => {
    await actAsFixture(db, users.owner);
    for (const sql of [
      "select photo_url from public.catches",
      "truncate public.catches",
      "select latitude from public.fishing_reports",
    ])
      await denied(() => db.query(sql));
    await actAsFixture(db, "", "anon");
    await denied(() => publish());
    await denied(() =>
      db.query("insert into public.comments(report_id,user_id,body)values($1,$2,'fixture')", [
        report,
        users.owner,
      ]),
    );
  });
  it.each(["unconfirmed", "anonymous"])("denies %s accounts at the DB boundary", async (kind) => {
    await addReport();
    await db.query(
      kind === "unconfirmed"
        ? "update auth.users set email_confirmed_at=null where id=$1"
        : "update auth.users set is_anonymous=true where id=$1",
      [users.owner],
    );
    await actAsFixture(db, users.owner);
    await denied(() => publish(other));
    await denied(() =>
      db.query("insert into public.catches(report_id,user_id,species)values($1,$2,'fixture')", [
        report,
        users.owner,
      ]),
    );
  });
});

describe("Public chat metadata and private media (isolated SQL)", () => {
  it("provides only factual country roots and no invented messages", async () => {
    await actAsFixture(db, users.owner);
    expect((await db.query("select id from public.chat_places")).rows).toHaveLength(11);
    expect((await db.query("select id from public.chat_messages")).rows).toEqual([]);
  });
  it("checks authorship, bounded text and allowed reaction values", async () => {
    await actAsFixture(db, users.owner);
    const country = (
      await db.query<{ id: string }>(
        "select id from public.chat_places where country_code='RU' and level='country'",
      )
    ).rows[0]!.id;
    const args = [users.owner, country];
    await denied(
      () =>
        db.query(
          "insert into public.chat_messages(user_id,body,place_id)values($1,repeat('x',2001),$2)",
          args,
        ),
      "23514",
    );
    await db.query(
      "insert into public.chat_messages(user_id,body,place_id)values($1,'SQL fixture',$2)",
      args,
    );
    const id = (await db.query<{ id: string }>("select id from public.chat_messages")).rows[0]!.id;
    await actAsFixture(db, users.outsider);
    await denied(() =>
      db.query(
        "insert into public.chat_messages(user_id,body,place_id)values($1,'spoof',$2)",
        args,
      ),
    );
    await db.query(
      "insert into public.chat_message_reactions(message_id,user_id,emoji)values($1,$2,'👍')",
      [id, users.outsider],
    );
    await denied(
      () =>
        db.query(
          "insert into public.chat_message_reactions(message_id,user_id,emoji)values($1,$2,'👍')",
          [id, users.outsider],
        ),
      "23505",
    );
    expect(
      (await db.query("delete from public.chat_messages where id=$1 returning id", [id])).rows,
    ).toEqual([]);
  });
  it("does not let the client register unprocessed photo bytes or sign direct Storage URLs", async () => {
    await db.query(
      "insert into public.chat_messages(id,user_id,body,place_id)values($1,$2,'fixture',(select id from public.chat_places where level='country' and country_code='RU'))",
      [msg, users.owner],
    );
    const path = `${users.owner}/${msg}/${photo}.jpg`;
    await db.query(
      "insert into public.chat_message_photos(id,message_id,user_id,storage_path)values($1,$2,$3,$4)",
      [photo, msg, users.owner, path],
    );
    await db.query("insert into storage.objects values('chat-photos',$1)", [path]);
    await actAsFixture(db, users.outsider);
    expect((await db.query("select id from public.chat_message_photos")).rows).toEqual([]);
    expect(
      (await db.query("select name from storage.objects where bucket_id='chat-photos'")).rows,
    ).toEqual([]);
    await denied(() =>
      db.query(
        "update public.chat_message_photos set sanitized_path=storage_path,sanitized_at=now()",
      ),
    );
    await denied(() => db.query("insert into storage.objects values('chat-photos','raw.jpg')"));
    await actAsFixture(db, users.owner);
    expect((await db.query("select id from public.chat_message_photos")).rows).toHaveLength(1);
    expect(
      (await db.query("select name from storage.objects where bucket_id='chat-photos'")).rows,
    ).toEqual([]);
    await actAsFixture(db, "", "anon");
    await denied(() => db.query("select id from public.chat_messages"));
  });
  it("creates case-normalized places idempotently and refuses invalid nesting", async () => {
    await actAsFixture(db, users.owner);
    const first = await db.query(
      "select ensure_chat_place('RU','Fixture Region','Fixture City') id",
    );
    expect(
      (await db.query("select ensure_chat_place('RU',' fixture region ','fixture city') id")).rows,
    ).toEqual(first.rows);
    await denied(() => db.query("select ensure_chat_place('RU',null,'Invalid city')"), "22023");
    await denied(() => db.query("select ensure_chat_place('XX','Region',null)"), "22023");
  });
});

describe("Private profile gear and marks (isolated SQL)", () => {
  const rod = "40000000-0000-4000-8000-000000000071";
  const reel = "40000000-0000-4000-8000-000000000072";
  const kit = "40000000-0000-4000-8000-000000000073";
  async function gear() {
    await db.query(
      "insert into public.angler_gear(id,user_id,gear_type,brand,model)values($1,$3,'rod','Fixture','Fixture'),($2,$3,'reel','Fixture','Fixture')",
      [rod, reel, users.owner],
    );
  }
  it("keeps marks and tackle private and forbids crossing kit ownership/type", async () => {
    await gear();
    await actAsFixture(db, users.owner);
    await db.query(
      "insert into public.private_fishing_marks(user_id,kind,title,latitude,longitude)values($1,'other','SQL fixture',0,0)",
      [users.owner],
    );
    await denied(() =>
      db.query("insert into public.angler_gear_sets(user_id,rod_id,reel_id)values($1,$2,$3)", [
        users.owner,
        reel,
        rod,
      ]),
    );
    await actAsFixture(db, users.outsider);
    expect((await db.query("select id from public.private_fishing_marks")).rows).toEqual([]);
    expect((await db.query("select id from public.angler_gear")).rows).toEqual([]);
    await denied(() =>
      db.query("insert into public.angler_gear_sets(user_id,rod_id,reel_id)values($1,$2,$3)", [
        users.outsider,
        rod,
        reel,
      ]),
    );
    await actAsFixture(db, "", "anon");
    await denied(() => db.query("select id from public.private_fishing_marks"));
  });
  it("selects a single own primary kit through the guarded RPC only", async () => {
    await gear();
    await db.query(
      "insert into public.angler_gear_sets(id,user_id,rod_id,reel_id)values($1,$2,$3,$4)",
      [kit, users.owner, rod, reel],
    );
    await actAsFixture(db, users.owner);
    await db.query("select set_my_primary_gear_set($1)", [kit]);
    expect((await db.query("select is_primary from public.angler_gear_sets")).rows).toEqual([
      { is_primary: true },
    ]);
    await denied(() => db.query("update public.angler_gear_sets set is_primary=false"));
    await denied(() =>
      db.query("update public.angler_gear set gear_type='other' where id=$1", [rod]),
    );
    await actAsFixture(db, users.outsider);
    await denied(() => db.query("select set_my_primary_gear_set($1)", [kit]));
  });
});

describe("Schema rollback and replay protection", () => {
  it("allows confirmed own global messages while rejecting spoofing and anonymous writes", async () => {
    await actAsFixture(db, users.owner);
    const send = (id: string) =>
      db.query(
        "insert into public.chat_messages(user_id,body,place_id)values($1,'SQL global fixture','00000000-0000-4000-8000-000000000001')",
        [id],
      );
    await send(users.owner);
    await denied(() => send(users.outsider));
    await db.exec("reset role");
    await db.query("update auth.users set is_anonymous=true where id=$1", [users.owner]);
    await actAsFixture(db, users.owner);
    await denied(() => send(users.owner));
  });
  it("does not grant self-assignment through the newly adopted empty admin lookup", async () => {
    await actAsFixture(db, users.owner);
    expect((await db.query("select user_id from public.zapruda_admins")).rows).toEqual([]);
    await denied(() =>
      db.query("insert into public.zapruda_admins(user_id)values($1)", [users.owner]),
    );
    await denied(() => db.query("select created_at from public.zapruda_admins"));
  });
  it("preserves follows ownership and the deliberately signed-in social graph", async () => {
    await actAsFixture(db, users.owner);
    await db.query("insert into public.follows(follower_id,following_id)values($1,$2)", [
      users.owner,
      users.outsider,
    ]);
    await actAsFixture(db, users.outsider);
    expect((await db.query("select follower_id from public.follows")).rows).toEqual([
      { follower_id: users.owner },
    ]);
    expect((await db.query("delete from public.follows returning follower_id")).rows).toEqual([]);
    await denied(() =>
      db.query("insert into public.follows(follower_id,following_id)values($1,$2)", [
        users.owner,
        users.fourth,
      ]),
    );
  });
  it("keeps feedback body/contact and direct submission closed until its broker is reviewed", async () => {
    await db.query(
      "insert into public.community_requests(user_id,request_type,subject,body)values($1,'bug','SQL fixture','SQL fixture technical body')",
      [users.owner],
    );
    await actAsFixture(db, users.owner);
    expect((await db.query("select id,subject from public.community_requests")).rows).toHaveLength(
      1,
    );
    await denied(() => db.query("select body,contact from public.community_requests"));
    await denied(() =>
      db.query(
        "insert into public.community_requests(user_id,request_type,subject,body)values($1,'bug','SQL fixture','SQL fixture technical body')",
        [users.owner],
      ),
    );
    await actAsFixture(db, users.outsider);
    expect((await db.query("select id,subject from public.community_requests")).rows).toEqual([]);
  });
  it("refuses rollback across subsequent chat changes even on an empty dataset", async () => {
    await db.exec("savepoint subsequent_guard");
    await expect(applySqlFile(db, "staging/rollback_v075_pilot_schema.sql")).rejects.toThrow(
      /subsequent global chat policy/,
    );
    await db.exec("rollback to savepoint subsequent_guard");
    expect((await db.query("select id from public.chat_messages")).rows).toEqual([]);
  });
  it("accepts the existing trip matching contract and bounds duration/text", async () => {
    await db.query(
      "insert into public.partner_trips(id,organizer_id,duration_hours,experience_needed,boat_trip)values($1,$2,2,'Помогу новичку',false)",
      [report, users.owner],
    );
    await denied(
      () => db.query("update public.partner_trips set duration_hours=73 where id=$1", [report]),
      "23514",
    );
    await denied(
      () =>
        db.query("update public.partner_trips set meeting_area=repeat('x',181) where id=$1", [
          report,
        ]),
      "23514",
    );
  });
  it("publishes only the four intended chat/comment tables for RLS-filtered changes", async () => {
    const names = await db.query<{ tablename: string }>(
      "select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename",
    );
    expect(names.rows.map((r) => r.tablename)).toEqual([
      "chat_message_photos",
      "chat_message_reactions",
      "chat_messages",
      "comments",
    ]);
  });
  it("derives only the caller's progress and does not fabricate earned activity badges", async () => {
    await actAsFixture(db, users.owner);
    await publish();
    expect(
      (await db.query("select report_count,catches_count from my_fishing_progress()")).rows,
    ).toEqual([{ report_count: 1, catches_count: 1 }]);
    const badges = await db.query(
      "select credited_minutes,beta_eligible from public.my_activity_badges",
    );
    expect(badges.rows).toEqual([{ credited_minutes: 0, beta_eligible: false }]);
    await denied(() =>
      db.query("insert into public.beta_test_applications(user_id)values($1)", [users.owner]),
    );
    await denied(() =>
      db.query(
        "insert into public.user_activity_windows(user_id,window_at)values($1,now()-interval '30 days')",
        [users.owner],
      ),
    );
    await actAsFixture(db, users.outsider);
    expect(
      (await db.query("select report_count,catches_count from my_fishing_progress()")).rows,
    ).toEqual([{ report_count: 0, catches_count: 0 }]);
    expect(
      (
        await db.query(
          "select report_count from my_fishing_specializations_v2() where report_count>0",
        )
      ).rows,
    ).toEqual([]);
  });
  it("preserves geographic membership and checks confirmed accounts through the existing place RPC", async () => {
    await db.query("update public.angler_preferences set home_country_code='BY' where user_id=$1", [
      users.owner,
    ]);
    await actAsFixture(db, users.owner);
    await denied(() =>
      db.query(
        "insert into public.chat_messages(user_id,body,place_id)select $1,'fixture',id from public.chat_places where country_code='RU' and level='country'",
        [users.owner],
      ),
    );
    await db.exec("reset role");
    await db.query("update auth.users set email_confirmed_at=null where id=$1", [users.owner]);
    await actAsFixture(db, users.owner);
    await denied(() => db.query("select ensure_chat_place('BY','Unconfirmed region',null)"));
  });
  it("rolls an empty clone back, retains adopted tables/ACL, and can reapply the deltas", async () => {
    const clone = await baseline(false);
    try {
      await applySqlFile(clone, "staging/rollback_v075_pilot_schema.sql");
      expect(
        (await clone.query("select to_regclass('public.chat_message_photos') id")).rows,
      ).toEqual([{ id: null }]);
      expect(
        (await clone.query("select to_regclass('public.catches') is not null ok")).rows,
      ).toEqual([{ ok: true }]);
      for (const delta of deltas) await applySqlFile(clone, "staging/" + delta);
      expect((await clone.query("select count(*)::int n from public.chat_places")).rows).toEqual([
        { n: 11 },
      ]);
    } finally {
      await clone.close();
    }
  }, 30000);
  it("refuses a rollback over populated or subsequently modified schemas", async () => {
    await actAsFixture(db, users.owner);
    await publish();
    await db.exec("reset role");
    await db.exec("drop policy staging_geo_messages_global_send on public.chat_messages");
    await db.exec("savepoint rollback_guard");
    await expect(applySqlFile(db, "staging/rollback_v075_pilot_schema.sql")).rejects.toThrow(
      /Rollback refused: preserve content/,
    );
    await db.exec("rollback to savepoint rollback_guard");
    expect((await db.query("select id from public.fishing_reports")).rows).toHaveLength(1);
  });
});
