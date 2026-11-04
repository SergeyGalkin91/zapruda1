// @vitest-environment node
import { it, expect } from "vitest";
import {
  createIsolatedPostgres,
  applySqlFile,
  actAsFixture,
  fixtureUsers,
} from "../test/isolated-postgres";
it("isolates read watermarks, excludes own messages, and never marks new arrivals read", async () => {
  const db = await createIsolatedPostgres();
  try {
    await db.exec(`create schema zapruda_internal; create function zapruda_internal.pilot_confirmed_actor_v075() returns boolean language sql as $$select auth.uid() is not null$$; grant usage on schema zapruda_internal to authenticated;
 create table chat_places(id uuid primary key); create table chat_messages(id uuid primary key,user_id uuid,place_id uuid,topic text,created_at timestamptz);
 grant select on chat_places,chat_messages to authenticated;
 insert into chat_places values('10000000-0000-4000-8000-000000000001');
 insert into chat_messages values('20000000-0000-4000-8000-000000000001','${fixtureUsers.outsider}','10000000-0000-4000-8000-000000000001','general',now()-interval '1 minute');`);
    await applySqlFile(db, "staging/v075_chat_read_state.sql");
    await db.exec("begin");
    await actAsFixture(db, fixtureUsers.owner);
    const summary = () =>
      db.query<{ unread: number }>(
        "select unread::int from chat_room_read_summary('10000000-0000-4000-8000-000000000001') where topic='general'",
      );
    expect((await summary()).rows[0]!.unread).toBe(1);
    await db.exec(
      "select mark_chat_read('10000000-0000-4000-8000-000000000001','general','20000000-0000-4000-8000-000000000001')",
    );
    expect((await summary()).rows[0]!.unread).toBe(0);
    await actAsFixture(db, fixtureUsers.outsider);
    expect((await db.query("select * from chat_read_state")).rows).toHaveLength(0);
    await db.exec(
      "reset role; insert into chat_messages values('20000000-0000-4000-8000-000000000002','" +
        fixtureUsers.outsider +
        "','10000000-0000-4000-8000-000000000001','general',now())",
    );
    await actAsFixture(db, fixtureUsers.owner);
    expect((await summary()).rows[0]!.unread).toBe(1);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 30000);
