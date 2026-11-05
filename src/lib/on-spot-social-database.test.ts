// @vitest-environment node
/** Actual isolated PostgreSQL policies/transactions. No JWT or hosted acceptance claim. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { actAsFixture, applySqlFile, fixtureUsers as users } from "../test/isolated-postgres";
import { createIsolatedOnSpotPostgres, ospDelta } from "../test/on-spot-postgres";

const zone = randomUUID(),
  room = randomUUID(),
  spot = randomUUID(),
  peerMessage = randomUUID();
const otherZone = randomUUID(),
  otherRoom = randomUUID(),
  report = randomUUID(),
  photo = randomUUID(),
  meetup = randomUUID();
const members = [users.owner, users.captain, users.fourth, randomUUID(), randomUUID()];
const identities = [...members, users.outsider];
const sessions = new Map(identities.map((id) => [id, randomUUID()]));
let db: PGlite;
let windowsApplyResult: unknown;
async function as(id: string, role = "authenticated") {
  await actAsFixture(db, id, role);
  await db.query("select set_config('test.session_id',$1,true)", [sessions.get(id) ?? ""]);
}
async function action<T = Record<string, unknown>>(
  name: string,
  payload: Record<string, unknown> = {},
  id: string | null = zone,
) {
  return (
    await db.query<{ value: T }>("select public.zc_osp_social($1,$2,$3::jsonb) value", [
      name,
      id,
      JSON.stringify(payload),
    ])
  ).rows[0]!.value;
}
type Snapshot = {
  presence: null | { expires_at: string; discoverable: boolean };
  allow_invites: boolean;
  announcements: boolean;
  people: Array<{ id: string; name: string }>;
  invites: Array<{
    id: string;
    status: string;
    outgoing: boolean;
    thread_id: string | null;
    meetup_id: string | null;
    report_id: string | null;
  }>;
  inbox: Array<{ id: string; body: string }>;
  photos: Array<{ photo_id: string; can_view: boolean; status: string }>;
  own_photos: Array<{ id: string; title: string }>;
};
const snapshot = (id = zone) => action<Snapshot>("snapshot", {}, id);
async function deny(op: () => Promise<unknown>, code = "42501") {
  await db.exec("savepoint must_deny");
  try {
    await expect(op()).rejects.toMatchObject({ code });
  } finally {
    await db.exec("rollback to savepoint must_deny; release savepoint must_deny");
  }
}
async function invitation() {
  await as(users.captain);
  await action("preferences", { invites: true });
  await as(users.owner);
  return (await action<{ id: string }>("invite", { peer: users.captain, id: peerMessage })).id;
}
async function accepted() {
  const id = await invitation();
  await as(users.captain);
  await action("invite_reply", { id, decision: "accepted" });
  return id;
}
async function share() {
  await accepted();
  await as(users.owner);
  await action("photo_request", { id: photo, peers: [users.captain], consent: true });
}
const visiblePhoto = () => db.query("select id from public.report_photos where id=$1", [photo]);
const shareAccess = () =>
  db.query<{ allowed: boolean }>("select public.zc_osp_shared_photo_access($1) allowed", [photo]);
beforeAll(async () => {
  db = await createIsolatedOnSpotPostgres();
  // These minimal fixtures reproduce relevant live STAGING contracts, not a second product schema.
  await db.exec(`
    alter table public.profiles add column if not exists display_name text;
    alter table public.profiles add column if not exists username text;
    create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users on delete cascade,not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$
      select jsonb_build_object('session_id',nullif(current_setting('test.session_id',true),''))
    $$;
    create table public.social_threads(
      id uuid primary key default gen_random_uuid(),requester_id uuid not null references auth.users,
      recipient_id uuid not null references auth.users,status text not null check(status in ('pending','accepted','declined')),
      created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
      unique(requester_id,recipient_id),check(requester_id<>recipient_id));
    create table public.social_messages(
      id uuid primary key default gen_random_uuid(),thread_id uuid not null references public.social_threads on delete cascade,
      sender_id uuid not null references auth.users,kind text not null default 'text' check(kind='text'),body text not null);
    alter table public.social_threads enable row level security;
    alter table public.social_messages enable row level security;
    create policy dm_thread_select on public.social_threads for select to authenticated
      using(auth.uid() in (requester_id,recipient_id));
    create policy dm_thread_insert on public.social_threads for insert to authenticated
      with check(auth.uid()=requester_id and status='pending');
    create policy dm_message_select on public.social_messages for select to authenticated
      using(exists(select 1 from public.social_threads t where t.id=thread_id and t.status='accepted'));
    create policy dm_message_insert on public.social_messages for insert to authenticated
      with check(sender_id=auth.uid() and exists(select 1 from public.social_threads t where t.id=thread_id and t.status='accepted'));
    create table public.meetup_posts(id uuid primary key,owner_id uuid not null references auth.users,title text not null,status text not null,created_at timestamptz default now());
    alter table public.report_photos enable row level security;
    alter table public.fishing_reports enable row level security;
    alter table public.report_photos add column if not exists created_at timestamptz default now();
    alter table public.report_photos add column if not exists storage_path text;
    alter table public.report_photos add column if not exists sanitized_path text;
    alter table public.report_photos add column if not exists sanitized_at timestamptz;
    grant select on public.report_photos,public.fishing_reports to anon;
    create policy osp_fixture_photo_base on public.report_photos for select to anon,authenticated
      using(exists(select 1 from public.fishing_reports r where r.id=report_id and (r.is_public or r.user_id=auth.uid())));
    create policy osp_fixture_report_base on public.fishing_reports for select to anon,authenticated
      using(is_public or user_id=auth.uid());
  `);
  for (const id of identities) {
    await db.query(
      "insert into auth.users(id,email_confirmed_at) values($1,now()) on conflict(id) do update set email_confirmed_at=now()",
      [id],
    );
    await db.query(
      "insert into public.profiles(id,display_name) values($1,'Offline fixture') on conflict(id) do update set display_name='Offline fixture'",
      [id],
    );
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [sessions.get(id), id]);
  }
  const manualApply = execFileSync(process.execPath, ["scripts/on-spot-staging-apply.mjs"], {
    encoding: "utf8",
  });
  const windowsApply = manualApply.replace(/\n/g, "\r\n");
  await db.exec(`
    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations (
      version text primary key,
      name text,
      statements text[]
    );
  `);

  const expectApplyFailure = async (message: string, query = manualApply) => {
    await expect(db.exec(query)).rejects.toThrow(message);
    await db.exec("rollback");
  };
  const expectStage2Absent = async () => {
    const state = await db.query(`
      select to_regclass('zc_osp_internal.presences') as presence,
        to_regprocedure('public.zc_osp_social(text,uuid,jsonb)') as rpc,
        exists(select 1 from supabase_migrations.schema_migrations
          where version='20261105044404') as recorded
    `);
    expect(state.rows).toEqual([{ presence: null, rpc: null, recorded: false }]);
  };
  await expectApplyFailure("Expected STAGING membership fingerprint is missing");
  await db.query(
    "insert into supabase_migrations.schema_migrations values ('20261105043101',$1,array[$2::text])",
    [
      "v076_on_spot_zone_membership",
      readFileSync("supabase/" + ospDelta("v076_on_spot_zone_membership"), "utf8"),
    ],
  );

  const tampered = windowsApply.replace(
    /(\$zapruda_reviewed_base64\$\r\n)([A-Za-z0-9+/])/,
    (_match, prefix: string, first: string) => prefix + (first === "A" ? "B" : "A"),
  );
  expect(tampered).not.toBe(windowsApply);
  await expectApplyFailure("Reviewed migration SHA-256 does not match this script", tampered);
  await expectStage2Absent();

  // Force a failure after the DDL, at the migration ledger write.
  await db.exec(`
    alter table supabase_migrations.schema_migrations
      add constraint test_reject_stage2_history check (version <> '20261105044404');
  `);
  await expectApplyFailure("test_reject_stage2_history");
  await expectStage2Absent();
  await expectApplyFailure("test_reject_stage2_history", windowsApply);
  await expectStage2Absent();
  await db.exec(`
    alter table supabase_migrations.schema_migrations drop constraint test_reject_stage2_history;
  `);

  windowsApplyResult = (await db.exec(windowsApply)).at(-1)?.rows;
  await expectApplyFailure("Social privacy history or schema already exists", windowsApply);
  await applySqlFile(db, "staging/DRAFT_v076_on_spot_community_zone_approval.sql");
}, 30000);
beforeEach(async () => {
  await db.exec("begin; reset role");
  await db.query("insert into public.zc_public_spots values($1,'approved',now())", [spot]);
  for (const [z, r] of [
    [zone, room],
    [otherZone, otherRoom],
  ]) {
    await db.query(
      "insert into public.chat_places(id,parent_id,level,country_code,name) select $1,id,'spot-zone','RU',$2 from public.chat_places where level='country' and country_code='RU'",
      [r, z === zone ? "OFFLINE ROOM A" : "OFFLINE ROOM B"],
    );
    await db.query(
      "insert into zc_osp_internal.zones(id,chat_place_id,source_spot_id,name,area_label,country_code,approved) values($1,$2,$3,'OFFLINE SQL ZONE','Coarse offline fixture','RU',true)",
      [z, r, spot],
    );
  }
  for (const id of members)
    await db.query("insert into zc_osp_internal.memberships(zone_id,user_id) values($1,$2)", [
      zone,
      id,
    ]);
  await db.query("insert into zc_osp_internal.memberships(zone_id,user_id) values($1,$2)", [
    otherZone,
    users.outsider,
  ]);
  await db.query(
    "insert into public.chat_messages(id,user_id,body,place_id) values($1,$2,'Offline consenting peer',$3)",
    [peerMessage, users.captain, room],
  );
  await db.query(
    "insert into public.meetup_posts(id,owner_id,title,status) values($1,$2,'Offline meetup','open')",
    [meetup, users.owner],
  );
  await db.query(
    "insert into public.fishing_reports(id,user_id,title,body,is_public) values($1,$2,'Offline private report','Test',false)",
    [report, users.owner],
  );
  await db.query(
    "insert into public.report_photos(id,report_id,user_id,storage_path,sanitized_path,sanitized_at) values($1,$2,$3,$4,$4,now())",
    [photo, report, users.owner, users.owner + "/" + report + "/" + photo + ".jpg"],
  );
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db?.close();
});

describe("ON SPOT+ social privacy and consent (isolated PostgreSQL)", () => {
  it("executes the full Windows CRLF SQL and verifies its migration SHA-256 in PostgreSQL", () => {
    expect(windowsApplyResult).toEqual([
      {
        status: "STAGING_APPLIED",
        version: "20261105044404",
        name: "v076_on_spot_social_privacy",
        sha256: "194e9b0606071a674cd15b44631c062d21aab657af0cb639e1f3459b2c57e16e",
      },
    ]);
  });
  it("records the reviewed stage 2 source exactly once through the manual STAGING transaction", async () => {
    const history = await db.query(
      "select statements from supabase_migrations.schema_migrations where version='20261105044404'",
    );
    expect(history.rows).toEqual([
      {
        statements: [readFileSync("supabase/" + ospDelta("v076_on_spot_social_privacy"), "utf8")],
      },
    ]);
  });
  it("denies outsiders, anonymous sessions, and direct private schema reads", async () => {
    await as(users.outsider);
    await deny(() => snapshot());
    await deny(() => action("presence_on", { minutes: 30 }));
    await as(users.owner);
    await deny(() => db.query("select * from zc_osp_internal.presences"));
    await as(users.owner, "anon");
    await deny(() => snapshot());
    await db.exec("reset role");
    await db.query("update auth.users set is_anonymous=true where id=$1", [users.owner]);
    await as(users.owner);
    await deny(() => snapshot());
  });
  it("keeps separate consents off by default; presence does not subscribe or discover", async () => {
    await as(users.owner);
    expect(await snapshot()).toMatchObject({
      presence: null,
      announcements: false,
      allow_invites: false,
      people: [],
    });
    await action("presence_on", { minutes: 120 });
    expect(await snapshot()).toMatchObject({
      presence: { discoverable: false },
      announcements: false,
      allow_invites: false,
      people: [],
    });
    await deny(() => action("presence_on", { minutes: 121 }));
    await action("presence_off");
    expect((await snapshot()).presence).toBeNull();
  });
  it("suppresses a small group, shows only consenting public names, and removes expired sessions", async () => {
    for (const id of members.slice(0, 4)) {
      await as(id);
      await action("presence_on", { minutes: 30, discoverable: true });
    }
    await as(users.owner);
    expect((await snapshot()).people).toEqual([]);
    await as(members[4]!);
    await action("presence_on", { minutes: 30, discoverable: true });
    await as(users.owner);
    const people = (await snapshot()).people;
    expect(people).toHaveLength(4);
    expect(Object.keys(people[0]!).sort()).toEqual(["id", "name"]);
    await db.exec("reset role");
    await db.query("delete from auth.sessions where id=$1", [sessions.get(members[4]!)]);
    await as(users.owner);
    expect((await snapshot()).people).toEqual([]);
  });
  it("revokes the old browser session after an account change and cannot recreate presence using it", async () => {
    await as(users.owner);
    await action("presence_on", { minutes: 30, discoverable: true });
    await action("clear_session", {}, null);
    await action("clear_session", {}, null);
    await deny(() => snapshot());
    await deny(() => action("presence_on", { minutes: 30, discoverable: true }));
    expect(
      (await db.query("select id from public.chat_messages where id=$1", [peerMessage])).rows,
    ).toEqual([]);
    await as(users.captain);
    expect((await snapshot()).presence).toBeNull();
  });
  it("removes expired rows and denies expired/mismatched signed-session IDs", async () => {
    await as(users.owner);
    await action("presence_on", { minutes: 30 });
    await db.exec(
      "reset role; update zc_osp_internal.presences set expires_at=now()-interval '1 second'",
    );
    await as(users.owner);
    expect((await snapshot()).presence).toBeNull();
    await db.exec("reset role");
    expect((await db.query("select * from zc_osp_internal.presences")).rows).toEqual([]);
    await as(users.owner);
    await db.query("select set_config('test.session_id',$1,true)", [sessions.get(users.captain)]);
    await deny(() => snapshot());
  });
  it("does not revive opted-in scopes when a revoked source spot is reviewed again", async () => {
    await as(users.owner);
    await action("presence_on", { minutes: 30, discoverable: true });
    await action("preferences", { announcements: true, invites: true });
    await db.exec("reset role; update public.zc_public_spots set state='rejected'");
    await as(users.owner);
    await deny(() => snapshot());
    await db.exec("reset role; update public.zc_public_spots set state='approved'");
    await as(users.owner);
    expect(await snapshot()).toMatchObject({
      presence: null,
      announcements: false,
      allow_invites: false,
    });
  });
  it("requires recipient opt-in and a visible peer, then reuses the actual DM on mutual acceptance", async () => {
    await as(users.owner);
    await deny(() => action("invite", { peer: users.captain, id: peerMessage }));
    await deny(() => action("invite", { peer: users.owner, id: peerMessage }));
    const id = await invitation();
    const repeat = await action<{ id: string }>("invite", { peer: users.captain, id: peerMessage });
    expect(repeat.id).toBe(id);
    await deny(() => action("invite_reply", { id, decision: "accepted" }));
    await as(users.fourth);
    await deny(() => action("invite_reply", { id, decision: "accepted" }));
    await as(users.captain);
    await action("invite_reply", { id, decision: "accepted" });
    const thread = (await snapshot()).invites[0]?.thread_id;
    expect(thread).toMatch(/^[0-9a-f-]{36}$/);
    await db.query(
      "insert into public.social_messages(thread_id,sender_id,body) values($1,$2,'Offline DM')",
      [thread, users.captain],
    );
    await as(users.owner);
    expect(
      (await db.query("select id from public.social_messages where thread_id=$1", [thread])).rows,
    ).toHaveLength(1);
    await as(users.outsider);
    expect(
      (await db.query("select id from public.social_messages where thread_id=$1", [thread])).rows,
    ).toEqual([]);
  });
  it("handles decline/cancel without granting DM or resurrecting a stale pending request", async () => {
    const id = await invitation();
    await as(users.captain);
    await deny(() => action("invite_cancel", { id }));
    await action("invite_reply", { id, decision: "declined" });
    expect((await snapshot()).invites[0]).toMatchObject({ status: "declined", thread_id: null });
    await deny(() => action("invite_reply", { id, decision: "accepted" }));
    await db.exec(
      "reset role; update zc_osp_internal.invitations set created_at=now()-interval '16 minutes'",
    );
    await as(users.owner);
    const next = (await action<{ id: string }>("invite", { peer: users.captain, id: peerMessage }))
      .id;
    await action("invite_cancel", { id: next });
    await as(users.captain);
    await deny(() => action("invite_reply", { id: next, decision: "accepted" }));
  });
  it("blocks private messages, the peer's local chat and invitations in both directions", async () => {
    const id = await accepted();
    const thread = (await snapshot()).invites[0]?.thread_id;
    await as(users.owner);
    await action("block", { peer: users.captain });
    expect((await snapshot()).invites).toEqual([]);
    expect(
      (await db.query("select id from public.chat_messages where id=$1", [peerMessage])).rows,
    ).toEqual([]);
    await as(users.captain);
    expect(
      (await db.query("select id from public.social_threads where id=$1", [thread])).rows,
    ).toEqual([]);
    await deny(() =>
      db.query(
        "insert into public.social_messages(thread_id,sender_id,body) values($1,$2,'Forbidden')",
        [thread, users.captain],
      ),
    );
    await as(users.owner);
    await action("unblock", { peer: users.captain });
    expect((await snapshot()).invites[0]).toMatchObject({
      id,
      status: "cancelled",
      thread_id: null,
    });
  });
  it("delivers only in-zone opt-in announcements and never redelivers after opt-out/re-opt-in", async () => {
    await as(users.outsider);
    await action("preferences", { announcements: true }, otherZone);
    await as(users.captain);
    await action("preferences", { announcements: true });
    await as(users.owner);
    await action("announce", { body: "Offline in-app notice" });
    await deny(() => action("announce", { body: "Spam" }), "54000");
    await as(users.fourth);
    expect((await snapshot()).inbox).toEqual([]);
    await as(users.outsider);
    expect((await snapshot(otherZone)).inbox).toEqual([]);
    await as(users.captain);
    expect((await snapshot()).inbox[0]?.body).toBe("Offline in-app notice");
    await action("preferences", { announcements: false });
    expect((await snapshot()).inbox).toEqual([]);
    await action("preferences", { announcements: true });
    expect((await snapshot()).inbox).toEqual([]);
  });
  it("links only the sender's real existing meetup/private report, without joining or publishing", async () => {
    const id = await accepted();
    await deny(() => action("link_trip", { id, meetup, report }));
    await as(users.owner);
    await action("link_trip", { id, meetup, report });
    expect((await snapshot()).invites[0]).toMatchObject({
      id,
      meetup_id: meetup,
      report_id: report,
    });
    await as(users.captain);
    expect((await snapshot()).invites[0]).toMatchObject({ id, meetup_id: meetup, report_id: null });
    expect(
      (await db.query("select id from public.fishing_reports where id=$1", [report])).rows,
    ).toEqual([]);
  });
  it("shares sanitized photos only after individual review/consent and closes access on revocation", async () => {
    await share();
    await as(users.captain);
    expect((await visiblePhoto()).rows).toEqual([]);
    await deny(() => action("photo_reply", { id: photo, decision: "approved" }));
    await action("photo_preview", { id: photo });
    expect((await shareAccess()).rows[0]?.allowed).toBe(true);
    expect(
      (await db.query("select id from public.fishing_reports where id=$1", [report])).rows,
    ).toEqual([]);
    await action("photo_reply", { id: photo, decision: "approved" });
    expect((await visiblePhoto()).rows).toEqual([{ id: photo }]);
    await as(users.fourth);
    expect((await visiblePhoto()).rows).toEqual([]);
    await db.exec("reset role; update public.fishing_reports set is_public=true");
    await as(users.outsider, "anon");
    expect((await visiblePhoto()).rows).toEqual([]);
    await as(users.captain);
    await action("photo_revoke", { id: photo });
    expect((await shareAccess()).rows[0]?.allowed).toBe(false);
    expect((await visiblePhoto()).rows).toEqual([]);
    await as(users.owner);
    expect((await visiblePhoto()).rows).toEqual([{ id: photo }]);
  });
  it("refuses unsupported uploads/participants and reports only visible items", async () => {
    await as(users.owner);
    await deny(() =>
      action("photo_request", { id: photo, peers: [users.captain], consent: false }),
    );
    await deny(() => action("photo_request", { id: photo, peers: [users.captain], consent: true }));
    await deny(() => action("report", { kind: "message", id: randomUUID(), reason: "spam" }));
    await action("report", { kind: "message", id: peerMessage, reason: "spam" });
    await db.exec("reset role");
    expect((await db.query("select subject_id from zc_osp_internal.abuse_reports")).rows).toEqual([
      { subject_id: peerMessage },
    ]);
  });
  it("withdraws scopes and private photo previews on leave", async () => {
    await share();
    await as(users.captain);
    await action("photo_preview", { id: photo });
    await action("preferences", { announcements: true });
    await db.query("select public.zc_osp_leave($1)", [zone]);
    expect((await visiblePhoto()).rows).toEqual([]);
    await deny(() => snapshot());
    await db.query("select public.zc_osp_join($1)", [zone]);
    expect(await snapshot()).toMatchObject({
      presence: null,
      announcements: false,
      photos: [{ status: "revoked", can_view: false }],
    });
  });
  it("limits rapid zone messages without changing global chat", async () => {
    await as(users.owner);
    await db.query(
      "insert into public.chat_messages(user_id,body,place_id) select $1,'SQL rate fixture',$2 from generate_series(1,15)",
      [users.owner, room],
    );
    await deny(
      () =>
        db.query(
          "insert into public.chat_messages(user_id,body,place_id) values($1,'Must throttle',$2)",
          [users.owner, room],
        ),
      "54000",
    );
    await db.query(
      "insert into public.chat_messages(user_id,body,place_id) values($1,'Global fixture','00000000-0000-4000-8000-000000000001')",
      [users.owner],
    );
  });
  it("keeps the private barrier on rollback and preserves the baseline zone chat", async () => {
    await share();
    await as(users.captain);
    await action("photo_preview", { id: photo });
    await db.exec("reset role");
    await applySqlFile(db, "staging/rollback_v076_on_spot_social_privacy.sql");
    await as(users.captain);
    await deny(() => snapshot());
    expect((await visiblePhoto()).rows).toEqual([]);
    expect(
      (await db.query("select id from public.chat_messages where id=$1", [peerMessage])).rows,
    ).toEqual([{ id: peerMessage }]);
    await as(users.owner);
    expect((await visiblePhoto()).rows).toEqual([{ id: photo }]);
  });
});

describe("ON SPOT+ community-zone approval (isolated PostgreSQL)", () => {
  const localZone = randomUUID();
  const localRoom = randomUUID();
  const localName = "Offline community area";
  const review = (approved: boolean, reference: string) =>
    db.query("select zc_osp_internal.review_community_zone($1,$2,$3)", [
      localZone,
      approved,
      reference,
    ]);
  const catalog = () =>
    db.query<{ zone_id: string; is_member: boolean }>("select * from public.zc_osp_catalog()");
  const join = () => db.query<{ room: string }>("select public.zc_osp_join($1) room", [localZone]);
  const messages = () =>
    db.query("select id from public.chat_messages where place_id=$1", [localRoom]);
  const send = (id: string, sender: string) =>
    db.query(
      "insert into public.chat_messages(id,user_id,body,place_id) values($1,$2,'Offline local chat',$3)",
      [id, sender, localRoom],
    );
  const enroll = async (id: string) => {
    await as(id);
    expect((await join()).rows).toEqual([{ room: localRoom }]);
  };

  beforeEach(async () => {
    await db.query(
      "insert into public.chat_places(id,parent_id,level,country_code,name) select $1,id,'spot-zone','RU',$2 from public.chat_places where level='country' and country_code='RU'",
      [localRoom, localName],
    );
    await db.query(
      "insert into zc_osp_internal.zones(id,chat_place_id,zone_kind,name,area_label,country_code) values($1,$2,'community',$3,'Coarse offline area','RU')",
      [localZone, localRoom, localName],
    );
  });

  it("requires private operator review for a community zone without a record spot", async () => {
    await as(users.owner);
    const rows = (await catalog()).rows;
    expect(rows.some((item) => item.zone_id === zone)).toBe(true);
    expect(rows.some((item) => item.zone_id === localZone)).toBe(false);
    await deny(() => join());
    await deny(() => review(true, "FixtureApprove"));
    await deny(() => db.query("select * from zc_osp_internal.community_zone_reviews"));
    await as(users.owner, "anon");
    await deny(() => catalog());
    await as(users.owner, "service_role");
    await deny(() => review(true, "FixtureApprove"));
    await deny(() => db.query("select * from zc_osp_internal.community_zone_reviews"));
    await deny(
      () => db.query("update zc_osp_internal.zones set approved=true where id=$1", [localZone]),
      "23514",
    );
    await db.exec("reset role");
    await deny(() => review(true, "invalid reference"), "22023");
    await review(true, "FixtureApprove");
    await review(true, "FixtureApprove");
    await as(users.owner);
    expect((await catalog()).rows.find((item) => item.zone_id === localZone)).toEqual({
      zone_id: localZone,
      chat_place_id: localRoom,
      name: localName,
      area_label: "Coarse offline area",
      country_code: "RU",
      is_member: false,
    });
  });

  it("allows only voluntary members to exchange messages and closes access after leave or ban", async () => {
    await review(true, "FixtureApprove");
    const messageId = randomUUID();
    await enroll(users.owner);
    await send(messageId, users.owner);
    await as(users.captain);
    expect((await messages()).rows).toEqual([]);
    await deny(() => send(randomUUID(), users.captain));
    await enroll(users.captain);
    expect((await messages()).rows).toEqual([{ id: messageId }]);
    await db.query("select public.zc_osp_leave($1)", [localZone]);
    expect((await messages()).rows).toEqual([]);
    await deny(() => send(randomUUID(), users.captain));
    await db.exec("reset role");
    await db.query("insert into zc_osp_internal.bans(zone_id,user_id) values($1,$2)", [
      localZone,
      users.captain,
    ]);
    await as(users.captain);
    expect((await catalog()).rows.some((item) => item.zone_id === localZone)).toBe(false);
    await deny(() => join());
  });

  it("reuses consent scopes and closes chat, presence, announcements and photo access on withdrawal", async () => {
    await review(true, "FixtureApprove");
    await enroll(users.captain);
    const localPeerMessage = randomUUID();
    await send(localPeerMessage, users.captain);
    await action("preferences", { invites: true, announcements: true }, localZone);
    await enroll(users.owner);
    await action("presence_on", { minutes: 30 }, localZone);
    const invite = await action<{ id: string }>(
      "invite",
      { peer: users.captain, id: localPeerMessage },
      localZone,
    );
    await action("announce", { body: "Offline local inbox" }, localZone);
    await as(users.captain);
    expect((await snapshot(localZone)).inbox[0]?.body).toBe("Offline local inbox");
    await action("invite_reply", { id: invite.id, decision: "accepted" }, localZone);
    await as(users.owner);
    await action("link_trip", { id: invite.id, meetup, report }, localZone);
    await action("photo_request", { id: photo, peers: [users.captain], consent: true }, localZone);
    await as(users.captain);
    await action("photo_preview", { id: photo }, localZone);
    expect((await shareAccess()).rows[0]?.allowed).toBe(true);
    await db.exec("reset role");
    await review(false, "FixtureWithdraw");
    await review(false, "FixtureWithdraw");
    const active = await db.query(
      "select user_id from zc_osp_internal.presences where zone_id=$1",
      [localZone],
    );
    expect(active.rows).toEqual([]);
    await deny(() => review(true, "FixtureApprove"), "55000");
    await as(users.captain);
    expect((await messages()).rows).toEqual([]);
    expect((await shareAccess()).rows[0]?.allowed).toBe(false);
    await deny(() => snapshot(localZone));
    await deny(() => join());
  });

  it("fails closed after a room changes and still permits withdrawal", async () => {
    await review(true, "FixtureApprove");
    await enroll(users.owner);
    await db.exec("reset role");
    await deny(
      () =>
        db.query("update zc_osp_internal.zones set area_label='Different area' where id=$1", [
          localZone,
        ]),
      "23514",
    );
    await db.query("update public.chat_places set name='Different area' where id=$1", [localRoom]);
    await as(users.owner);
    expect((await catalog()).rows.some((item) => item.zone_id === localZone)).toBe(false);
    await deny(() => join());
    await db.exec("reset role");
    await review(false, "FixtureWithdraw");
    await db.query("update public.chat_places set name=$2 where id=$1", [localRoom, localName]);
    await as(users.owner);
    await deny(() => join());
  });

  it("denies an expired or closed session even to a confirmed account", async () => {
    await review(true, "FixtureApprove");
    await enroll(users.owner);
    await action("clear_session", {}, localZone);
    await deny(() => catalog());
    await deny(() => join());
  });

  it("shuts down community zones on rollback and preserves reviewed record zones", async () => {
    await review(true, "FixtureApprove");
    await enroll(users.owner);
    await action("presence_on", { minutes: 30 }, localZone);
    await db.exec("reset role");
    await applySqlFile(db, "staging/rollback_v076_on_spot_community_zone_approval.sql");
    await deny(() => review(true, "FixtureApprove"), "23514");
    const audit = await db.query(
      "select zone_id from zc_osp_internal.community_zone_reviews where zone_id=$1",
      [localZone],
    );
    expect(audit.rows).toEqual([{ zone_id: localZone }]);
    await as(users.owner);
    expect((await catalog()).rows.some((item) => item.zone_id === zone)).toBe(true);
    expect((await catalog()).rows.some((item) => item.zone_id === localZone)).toBe(false);
    await deny(() => snapshot(localZone));
    expect(
      (await db.query("select id from public.chat_messages where id=$1", [peerMessage])).rows,
    ).toEqual([{ id: peerMessage }]);
  });
});
