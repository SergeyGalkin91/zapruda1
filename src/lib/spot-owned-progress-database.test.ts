// @vitest-environment node
/** Disconnected PostgreSQL fixtures. Never a signed-JWT or genuine KING acceptance claim. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SpotOwnProgress } from "./spot-api";
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  moderator = "00000000-0000-4000-8000-000000000003";
const spot = "10000000-0000-4000-8000-000000000001",
  caught = "20000000-0000-4000-8000-000000000001";
const files = JSON.parse(
  readFileSync("supabase/tests/unit/spot-sql-files.json", "utf8"),
) as string[];
const names = readdirSync("supabase/migrations").filter((n) =>
  n.endsWith("_v076_owned_spot_progress.sql"),
);
if (names.length !== 1) throw new Error("Expected exactly one new owned progress delta");
const delta = readFileSync("supabase/migrations/" + names[0], "utf8");
let db: PGlite;
async function act(id: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('test.user_id',$1,true)", [id ?? ""]);
  await db.exec("set local role authenticated");
}
async function progress() {
  return (
    await db.query<{ value: SpotOwnProgress }>("select public.zc_spot_my_progress() as value")
  ).rows[0]!.value;
}
async function review() {
  await act(moderator);
  await db.query("select public.zc_spot_review($1,'verified',true,false,false)", [caught]);
}
beforeAll(async () => {
  db = await PGlite.create();
  for (const file of files) await db.exec(readFileSync("supabase/" + file, "utf8"));
  await db.exec("alter table auth.users add column is_anonymous boolean not null default false");
  await db.exec(delta);
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
  await db.query("insert into zc_spot_internal.moderators(user_id) values($1)", [moderator]);
  await db.query(
    "insert into public.zc_public_spots(id,name,city,region,waterbody_name,disciplines,state,reviewed_at) values($1,'ISOLATED SQL FIXTURE','Fixture','Fixture','Fixture',array['street'],'approved',now())",
    [spot],
  );
  await db.query(
    "insert into zc_spot_internal.catches(id,owner_id,league,method,species_id,weight_g,length_mm,captured_at) values($1,$2,'street','shore-spinning','pike',1000,400,now())",
    [caught, owner],
  );
  await db.query(
    "insert into zc_spot_internal.capture_scopes(catch_id,scope_type,scope_id) values($1,'spot',$2)",
    [caught, spot],
  );
  await db.query(
    "insert into storage.objects(bucket_id,name) values('zc-spot-evidence-staging','private-original-fixture')",
  );
  await db.query(
    "insert into zc_spot_internal.evidence(catch_id,private_storage_key,evidence_kind) values($1,'private-original-fixture','photo')",
    [caught],
  );
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db?.close();
});
describe("owner progress on isolated PostgreSQL, not genuine evidence/JWT E2E", () => {
  it("does not award a profile crown for a pending catch", async () => {
    await act(owner);
    const value = await progress();
    expect(value.catches).toHaveLength(1);
    expect(value.catches[0]?.status).toBe("pending");
    expect(value.titles).toEqual([]);
    expect(value.history).toEqual([]);
  });
  it("reflects actual SQL review, hides a stranger, and removes crowns after actual SQL revocation", async () => {
    await review();
    await act(owner);
    const awarded = await progress();
    expect(awarded.titles).toHaveLength(2);
    expect(awarded.history.every((h) => h.event === "received")).toBe(true);
    expect(JSON.stringify(awarded)).not.toMatch(
      /private-original|storage_key|owner_id|scope_id|latitude|longitude|https:/,
    );
    await act(other);
    expect(await progress()).toEqual({ catches: [], titles: [], history: [] });
    await act(moderator);
    await db.query("select public.zc_spot_revoke($1,'Isolated fixture review has been revoked')", [
      caught,
    ]);
    await act(owner);
    const revoked = await progress();
    expect(revoked.titles).toEqual([]);
    expect(revoked.catches[0]?.status).toBe("revoked");
    expect(revoked.history.filter((h) => h.event === "ended")).toHaveLength(2);
  });
  it("does not expose a stale crown when the original proof object is missing", async () => {
    await review();
    await db.exec("reset role; delete from storage.objects");
    await act(owner);
    expect((await progress()).titles).toEqual([]);
  });
  it.each(["unconfirmed", "anonymous", "no actor"])(
    "refuses %s even with the authenticated SQL role",
    async (kind) => {
      if (kind === "unconfirmed")
        await db.query("update auth.users set email_confirmed_at=null where id=$1", [owner]);
      if (kind === "anonymous")
        await db.query("update auth.users set is_anonymous=true where id=$1", [owner]);
      await act(kind === "no actor" ? null : owner);
      await expect(progress()).rejects.toMatchObject({ code: "42501" });
    },
  );
  it("keeps anonymous EXECUTE and direct private-table reads forbidden", async () => {
    const permissions = await db.query<{ exec: boolean; private_read: boolean }>(
      "select has_function_privilege('anon','public.zc_spot_my_progress()','execute') as exec,has_table_privilege('authenticated','zc_spot_internal.catches','select') as private_read",
    );
    expect(permissions.rows[0]).toEqual({ exec: false, private_read: false });
    await db.exec("set local role anon");
    await expect(progress()).rejects.toMatchObject({ code: "42501" });
  });
  it("has no parameter for selecting another user's history", async () => {
    await act(owner);
    await expect(
      db.query("select public.zc_spot_my_progress($1::uuid)", [other]),
    ).rejects.toMatchObject({ code: "42883" });
  });
  it("rolls back just the new RPC without deleting any catch or title", async () => {
    await review();
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/staging/rollback_v076_owned_spot_progress.sql", "utf8"));
    expect(
      (await db.query("select count(*)::int as n from zc_spot_internal.title_holders")).rows[0],
    ).toEqual({ n: 2 });
    expect(
      (await db.query("select to_regprocedure('public.zc_spot_my_progress()') as fn")).rows[0],
    ).toEqual({ fn: null });
    await db.exec(delta);
    await act(owner);
    expect((await progress()).titles).toHaveLength(2);
  });
});
