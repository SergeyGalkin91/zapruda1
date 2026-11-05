// @vitest-environment node
/** Disconnected SQL/RLS regression fixtures; NOT real signed-JWT/Realtime/zone acceptance. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import type { OnSpotZone } from "../integrations/supabase/on-spot.types";
import { actAsFixture, fixtureUsers as users } from "../test/isolated-postgres";
import { createIsolatedOnSpotPostgres } from "../test/on-spot-postgres";
const zone = "11000000-0000-4000-8000-000000000001",
  room = "22000000-0000-4000-8000-000000000001",
  spot = "33000000-0000-4000-8000-000000000001";
const message = "44000000-0000-4000-8000-000000000001",
  photo = "55000000-0000-4000-8000-000000000001",
  global = "00000000-0000-4000-8000-000000000001";
let db: PGlite;
const catalog = () => db.query<OnSpotZone>("select * from public.zc_osp_catalog()");
const join = (id = zone) => db.query("select public.zc_osp_join($1) as room", [id]);
const leave = (id = zone) => db.query("select public.zc_osp_leave($1)", [id]);
const messages = () => db.query("select id from public.chat_messages where place_id=$1", [room]);
async function denied(fn: () => Promise<unknown>, code = "42501") {
  await db.exec("savepoint denied_action");
  try {
    await expect(fn()).rejects.toMatchObject({ code });
  } finally {
    await db.exec("rollback to savepoint denied_action; release savepoint denied_action");
  }
}
beforeAll(async () => {
  db = await createIsolatedOnSpotPostgres();
}, 30000);
beforeEach(async () => {
  await db.exec("begin; reset role");
  await db.query("insert into public.zc_public_spots values($1,'approved',now())", [spot]);
  await db.query(
    "insert into public.chat_places(id,parent_id,level,country_code,name) select $1,id,'spot-zone','RU','ISOLATED SQL ZONE' from public.chat_places where level='country' and country_code='RU'",
    [room],
  );
  await db.query(
    "insert into zc_osp_internal.zones(id,chat_place_id,source_spot_id,name,area_label,country_code,approved) values($1,$2,$3,'ISOLATED SQL ZONE','Coarse SQL fixture','RU',true)",
    [zone, room, spot],
  );
  await db.query(
    "insert into public.chat_messages(id,user_id,body,place_id) values($1,$2,'PRIVATE SQL FIXTURE',$3)",
    [message, users.owner, room],
  );
  await db.query(
    "insert into public.chat_message_reactions(message_id,user_id,emoji) values($1,$2,'👍')",
    [message, users.owner],
  );
  const key = `${users.owner}/${message}/${photo}.jpg`;
  await db.query(
    "insert into public.chat_message_photos(id,message_id,user_id,storage_path,sanitized_path,sanitized_at) values($1,$2,$3,$4,$4,now())",
    [photo, message, users.owner, key],
  );
  await db.query("insert into storage.objects(bucket_id,name) values('chat-photos',$1)", [key]);
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db?.close();
});
describe("ON SPOT+ explicit membership and existing-chat boundaries (isolated SQL only)", () => {
  it("lists only coarse approved catalog fields and never auto-joins", async () => {
    await actAsFixture(db, users.owner);
    const rows = (await catalog()).rows;
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual(
      ["area_label", "chat_place_id", "country_code", "is_member", "name", "zone_id"].sort(),
    );
    expect(rows[0]?.is_member).toBe(false);
    expect((await messages()).rows).toEqual([]);
    expect(
      (await db.query("select * from public.chat_room_read_summary($1)", [room])).rows,
    ).toEqual([]);
  });
  it("does not grant direct private table/schema access or accept another actor argument", async () => {
    await actAsFixture(db, users.owner);
    await denied(() => db.query("select * from zc_osp_internal.memberships"));
    await denied(() =>
      db.query("insert into zc_osp_internal.memberships values($1,$2,now())", [zone, users.owner]),
    );
    await denied(
      () => db.query("select public.zc_osp_join($1,$2)", [zone, users.outsider]),
      "42883",
    );
  });
  it("makes join and leave idempotent and never changes a stranger's membership", async () => {
    await actAsFixture(db, users.owner);
    await join();
    await join();
    expect((await catalog()).rows[0]?.is_member).toBe(true);
    expect((await messages()).rows).toEqual([{ id: message }]);
    await actAsFixture(db, users.captain);
    await join();
    await actAsFixture(db, users.owner);
    await leave();
    await leave();
    expect((await messages()).rows).toEqual([]);
    await actAsFixture(db, users.captain);
    expect((await messages()).rows).toEqual([{ id: message }]);
    await db.exec("reset role");
    expect(
      (await db.query<{ n: number }>("select count(*)::int n from zc_osp_internal.memberships"))
        .rows[0]?.n,
    ).toBe(1);
  });
  it("allows a member's existing message/reaction/photo/read APIs and denies an unjoined account", async () => {
    await actAsFixture(db, users.owner);
    await join();
    const inserted = await db.query(
      "insert into public.chat_messages(user_id,body,place_id) values($1,'Owned SQL fixture',$2) returning id",
      [users.owner, room],
    );
    expect(inserted.rows).toHaveLength(1);
    expect(
      (
        await db.query("select id from public.chat_message_reactions where message_id=$1", [
          message,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select id from public.chat_message_photos where message_id=$1", [message]))
        .rows,
    ).toHaveLength(1);
    await db.query("select public.mark_chat_read($1,'general',$2)", [room, message]);
    await actAsFixture(db, users.outsider);
    expect((await messages()).rows).toEqual([]);
    expect(
      (
        await db.query("select id from public.chat_message_reactions where message_id=$1", [
          message,
        ])
      ).rows,
    ).toEqual([]);
    expect(
      (await db.query("select id from public.chat_message_photos where message_id=$1", [message]))
        .rows,
    ).toEqual([]);
    await denied(() =>
      db.query(
        "insert into public.chat_messages(user_id,body,place_id) values($1,'Must fail',$2)",
        [users.outsider, room],
      ),
    );
    await denied(() =>
      db.query(
        "insert into public.chat_message_reactions(message_id,user_id,emoji) values($1,$2,'🔥')",
        [message, users.outsider],
      ),
    );
    expect(
      (await db.query("select * from public.chat_room_read_summary($1)", [room])).rows,
    ).toEqual([]);
  });
  it("revokes message/photo/reaction/read access on leave", async () => {
    await actAsFixture(db, users.owner);
    await join();
    await leave();
    expect((await messages()).rows).toEqual([]);
    expect(
      (await db.query("select id from public.chat_message_photos where message_id=$1", [message]))
        .rows,
    ).toEqual([]);
    expect(
      (await db.query("select * from public.chat_room_read_summary($1)", [room])).rows,
    ).toEqual([]);
  });
  it.each(["closed zone", "revoked source", "missing source review", "wrong room kind"])(
    "fails closed for %s after joining",
    async (kind) => {
      await actAsFixture(db, users.owner);
      await join();
      await db.exec("reset role");
      if (kind === "closed zone") await db.exec("update zc_osp_internal.zones set approved=false");
      if (kind === "revoked source")
        await db.exec("update public.zc_public_spots set state='rejected'");
      if (kind === "missing source review")
        await db.exec("update public.zc_public_spots set reviewed_at=null");
      if (kind === "wrong room kind")
        await db.query("update public.chat_places set level='city' where id=$1", [room]);
      await actAsFixture(db, users.owner);
      expect((await messages()).rows).toEqual([]);
      expect((await catalog()).rows).toEqual([]);
      await denied(() => join());
    },
  );
  it("never makes an orphaned former zone room public", async () => {
    await actAsFixture(db, users.owner);
    await join();
    await db.exec("reset role; delete from zc_osp_internal.zones");
    await actAsFixture(db, users.owner);
    expect((await messages()).rows).toEqual([]);
  });
  it("preserves a moderation ban across leave/rejoin attempts", async () => {
    await actAsFixture(db, users.owner);
    await join();
    await db.exec("reset role");
    await db.query("insert into zc_osp_internal.bans(zone_id,user_id) values($1,$2)", [
      zone,
      users.owner,
    ]);
    await actAsFixture(db, users.owner);
    await leave();
    await denied(() => join());
    expect((await catalog()).rows).toEqual([]);
    expect((await messages()).rows).toEqual([]);
  });
  it.each(["unconfirmed", "anonymous"])(
    "denies %s user despite authenticated database role",
    async (kind) => {
      if (kind === "unconfirmed")
        await db.query("update auth.users set email_confirmed_at=null where id=$1", [users.owner]);
      else await db.query("update auth.users set is_anonymous=true where id=$1", [users.owner]);
      await actAsFixture(db, users.owner);
      await denied(() => catalog());
      await denied(() => join());
      expect((await messages()).rows).toEqual([]);
    },
  );
  it("denies guests and keeps raw Storage private", async () => {
    await actAsFixture(db, users.owner);
    await join();
    expect(
      (await db.query("select * from storage.objects where bucket_id='chat-photos'")).rows,
    ).toEqual([]);
    await actAsFixture(db, users.owner, "anon");
    await denied(() => catalog());
  });
  it("does not repurpose an existing global/country room as a zone", async () => {
    await denied(
      () =>
        db.query(
          "insert into zc_osp_internal.zones(chat_place_id,source_spot_id,name,area_label,country_code,approved) values($1,$2,'Invalid SQL fixture','Coarse SQL fixture','RU',true)",
          [global, spot],
        ),
      "23514",
    );
  });
  it("preserves normal global chat permissions", async () => {
    await actAsFixture(db, users.owner);
    expect(
      (
        await db.query(
          "insert into public.chat_messages(user_id,body,place_id) values($1,'Global SQL fixture',$2) returning id",
          [users.owner, global],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("does not let a browser provision zone rooms through a broad place insert policy", async () => {
    // Adversarial policy fixture: the restrictive boundary must still win.
    await db.exec(
      "create policy unrelated_place_insert on public.chat_places for insert to authenticated with check(true)",
    );
    await actAsFixture(db, users.owner);
    await denied(() =>
      db.query(
        "insert into public.chat_places(parent_id,level,country_code,name,created_by) values($1,'spot-zone','RU','Forbidden SQL fixture',$2)",
        [global, users.owner],
      ),
    );
  });
  it("rolls back feature access while preserving data and global chat", async () => {
    await actAsFixture(db, users.owner);
    await join();
    await db.exec("reset role");
    await db.exec(
      readFileSync("supabase/staging/rollback_v076_on_spot_zone_membership.sql", "utf8"),
    );
    expect(
      (await db.query<{ n: number }>("select count(*)::int n from zc_osp_internal.memberships"))
        .rows[0]?.n,
    ).toBe(1);
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.chat_messages where place_id=$1",
          [room],
        )
      ).rows[0]?.n,
    ).toBe(1);
    await actAsFixture(db, users.owner);
    await denied(() => catalog());
    expect((await messages()).rows).toEqual([]);
    expect(
      (
        await db.query(
          "insert into public.chat_messages(user_id,body,place_id) values($1,'Global rollback fixture',$2) returning id",
          [users.owner, global],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("keeps the new delta outside automatic Production migrations", () => {
    expect(
      readdirSync("supabase/migrations").some((n) => n.includes("v076_on_spot_zone_membership")),
    ).toBe(false);
  });
});
