import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  actAsFixture,
  applySqlFile,
  createIsolatedPostgres,
  fixtureUsers,
} from "@/test/isolated-postgres";

// Real disconnected PostgreSQL/RLS execution; role simulation, not signed JWT E2E.
const u = Object.values(fixtureUsers);
const groupA = "20000000-0000-4000-8000-000000000001";
const groupB = "20000000-0000-4000-8000-000000000002";
const post = "30000000-0000-4000-8000-000000000001";
let db: PGlite;
async function asUser(uid: string, statement: string, params: unknown[] = []) {
  await actAsFixture(db, uid);
  return db.query(statement, params);
}
async function denied(
  uid: string,
  statement: string,
  params: unknown[] = [],
  role = "authenticated",
) {
  await db.exec("savepoint refusal");
  let error: unknown;
  try {
    await actAsFixture(db, uid, role);
    await db.query(statement, params);
  } catch (caught) {
    error = caught;
  }
  await db.exec("rollback to savepoint refusal; release savepoint refusal");
  expect(error).toBeTruthy();
}
beforeAll(async () => {
  db = await createIsolatedPostgres();
  await applySqlFile(db, "tests/unit/club_message_context.sql");
  await applySqlFile(db, "staging/v076_club_message_membership_scope.sql");
  await applySqlFile(db, "staging/20261102_v071_meetups_DRAFT_REVIEW_BEFORE_APPLY.sql");
  await applySqlFile(db, "staging/20261102_v071_meetup_integrity_hardening.sql");
  await applySqlFile(db, "staging/20261102_v071_meetup_rpc_grant_hardening.sql");
  await applySqlFile(db, "staging/20261102231917_meetup_table_privilege_hardening.sql");
  await applySqlFile(db, "staging/v076_meetup_leave_cancel.sql");
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("begin");
  await db.query(
    "insert into social_groups(id,name,owner_id) values($1,'Disconnected A',$3),($2,'Disconnected B',$4)",
    [groupA, groupB, u[0], u[1]],
  );
  await db.query(
    "insert into social_group_members(group_id,user_id,status) values($1,$3,'accepted'),($2,$4,'accepted'),($1,$5,'pending'),($2,$5,'accepted'),($1,$6,'declined'),($2,$6,'accepted')",
    [groupA, groupB, ...u],
  );
  await db.query(
    "insert into social_group_messages(group_id,user_id,body) values($1,$3,'Fixture A'),($2,$4,'Fixture B')",
    [groupA, groupB, u[0], u[1]],
  );
  await asUser(
    u[0]!,
    "insert into meetup_posts(id,owner_id,country_code,region_code,city_code,title) values($1,$2,'RU','QA','QA','Disconnected test')",
    [post, u[0]],
  );
  for (const uid of u.slice(1))
    await asUser(uid, "insert into meetup_members(post_id,user_id) values($1,$2)", [post, uid]);
});
afterEach(async () => db.exec("rollback"));

describe("club message membership scope", () => {
  it("allows accepted own-club messages and blocks read/write in a different club", async () => {
    expect((await asUser(u[0]!, "select body from social_group_messages")).rows).toEqual([
      { body: "Fixture A" },
    ]);
    await asUser(
      u[0]!,
      "insert into social_group_messages(group_id,user_id,body) values($1,$2,'Allowed')",
      [groupA, u[0]],
    );
    await denied(
      u[0]!,
      "insert into social_group_messages(group_id,user_id,body) values($1,$2,'Forbidden')",
      [groupB, u[0]],
    );
    await denied(
      u[0]!,
      "insert into social_group_messages(group_id,user_id,body) values($1,$2,'Spoofed')",
      [groupA, u[1]],
    );
  });
  it("denies pending and declined members even when accepted in another club", async () => {
    for (const uid of [u[2]!, u[3]!]) {
      expect(
        (await asUser(uid, "select body from social_group_messages where group_id=$1", [groupA]))
          .rows,
      ).toHaveLength(0);
      await denied(
        uid,
        "insert into social_group_messages(group_id,user_id,body) values($1,$2,'Forbidden')",
        [groupA, uid],
      );
      expect(
        (await asUser(uid, "select body from social_group_messages where group_id=$1", [groupB]))
          .rows,
      ).toHaveLength(1);
    }
  });
  it("denies anonymous reads and writes", async () => {
    await denied("", "select * from social_group_messages", [], "anon");
    await denied(
      "",
      "insert into social_group_messages(group_id,user_id,body) values($1,$2,'Forbidden')",
      [groupA, u[0]],
      "anon",
    );
  });
});

describe("meetup leave, cancellation, capacity and privacy", () => {
  it("frees an accepted participant's seat, revokes private access and permits an approved rejoin", async () => {
    await asUser(
      u[0]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id in($2,$3)",
      [post, u[1], u[2]],
    );
    await asUser(
      u[0]!,
      "insert into meetup_private_details(post_id,owner_id,private_place) values($1,$2,'Private fixture')",
      [post, u[0]],
    );
    await asUser(
      u[1]!,
      "insert into meetup_messages(post_id,sender_id,body) values($1,$2,'Private fixture')",
      [post, u[1]],
    );
    await denied(
      u[0]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, u[3]],
    );
    await asUser(
      u[1]!,
      "update meetup_members set status='declined' where post_id=$1 and user_id=$2",
      [post, u[1]],
    );
    expect((await asUser(u[0]!, "select meetup_occupancy($1) n", [post])).rows).toEqual([{ n: 2 }]);
    expect(
      (await asUser(u[1]!, "select * from meetup_private_details where post_id=$1", [post])).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(u[1]!, "select * from meetup_messages where post_id=$1", [post])).rows,
    ).toHaveLength(0);
    await denied(
      u[1]!,
      "insert into meetup_messages(post_id,sender_id,body) values($1,$2,'Forbidden')",
      [post, u[1]],
    );
    await asUser(
      u[1]!,
      "update meetup_members set status='pending' where post_id=$1 and user_id=$2",
      [post, u[1]],
    );
    await denied(
      u[1]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, u[1]],
    );
    await asUser(
      u[0]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, u[3]],
    );
  });
  it("cancellation reports zero active seats and revokes private access without deleting history", async () => {
    await asUser(
      u[0]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, u[1]],
    );
    await asUser(
      u[0]!,
      "insert into meetup_private_details(post_id,owner_id,private_place) values($1,$2,'Private fixture')",
      [post, u[0]],
    );
    await asUser(
      u[1]!,
      "insert into meetup_messages(post_id,sender_id,body) values($1,$2,'History')",
      [post, u[1]],
    );
    await asUser(u[0]!, "update meetup_posts set status='cancelled' where id=$1", [post]);
    expect(
      (await asUser(u[1]!, "select meetup_occupancy($1) n, meetup_is_accepted($1) access", [post]))
        .rows,
    ).toEqual([{ n: 0, access: false }]);
    expect(
      (await asUser(u[1]!, "select * from meetup_private_details where post_id=$1", [post])).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(u[1]!, "select * from meetup_messages where post_id=$1", [post])).rows,
    ).toHaveLength(0);
    await denied(
      u[1]!,
      "insert into meetup_messages(post_id,sender_id,body) values($1,$2,'Forbidden')",
      [post, u[1]],
    );
    await denied(
      u[0]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, u[2]],
    );
    await denied(u[0]!, "update meetup_posts set status='open' where id=$1", [post]);
    await db.exec("reset role");
    expect(
      (await db.query("select count(*)::int n from meetup_messages where post_id=$1", [post])).rows,
    ).toEqual([{ n: 1 }]);
  });
  it("keeps owner identity, membership identity and admission authority immutable", async () => {
    await denied(
      u[0]!,
      "update meetup_members set status='declined' where post_id=$1 and user_id=$2",
      [post, u[0]],
    );
    await denied(u[1]!, "update meetup_members set user_id=$3 where post_id=$1 and user_id=$2", [
      post,
      u[1],
      u[3],
    ]);
    await denied(
      u[1]!,
      "update meetup_members set status='accepted' where post_id=$1 and user_id=$2",
      [post, u[1]],
    );
    await denied(u[1]!, "select * from meetup_private_details", [], "anon");
    const result = await asUser(
      u[1]!,
      "update meetup_members set status='declined' where post_id=$1 and user_id=$2 returning user_id",
      [post, u[2]],
    );
    expect(result.rows).toHaveLength(0);
  });
});
