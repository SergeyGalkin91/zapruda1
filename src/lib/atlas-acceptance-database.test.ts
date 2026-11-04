// @vitest-environment node
import { expect, it } from "vitest";
import {
  createIsolatedPostgres,
  applySqlFile,
  actAsFixture,
  fixtureUsers as u,
} from "../test/isolated-postgres";
it("keeps Atlas unpublished catalog and private proof private, rejects forged ownership/status, and exposes only own progress", async () => {
  const db = await createIsolatedPostgres();
  try {
    await db.exec(`create schema zapruda_internal;
 create function zapruda_internal.pilot_confirmed_actor_v075() returns boolean language sql as $$select auth.uid() is not null$$;
 grant usage on schema zapruda_internal to authenticated;
 create table fishing_reports(id uuid primary key,user_id uuid);
 create table catches(id uuid primary key,user_id uuid,report_id uuid,species text);
 create table report_photos(id uuid primary key,user_id uuid,report_id uuid,sanitized_path text,sanitized_at timestamptz);
 grant select on fishing_reports,catches,report_photos to authenticated;`);
    await applySqlFile(db, "staging/v076_atlas_catalog.sql");
    const water = "10000000-0000-4000-8000-000000000001",
      fish = "20000000-0000-4000-8000-000000000001",
      report = "30000000-0000-4000-8000-000000000001",
      catchId = "40000000-0000-4000-8000-000000000001",
      photo = "50000000-0000-4000-8000-000000000001";
    await db.query(
      "insert into atlas_waterbodies(id,slug,country_code,name,kind) values($1,'fixture-water','RU','Isolated fixture','river')",
      [water],
    );
    await db.query(
      "insert into atlas_fish_species(id,code,name) values($1,'fixture-fish','Isolated fish')",
      [fish],
    );
    await db.query("insert into atlas_waterbody_species values($1,$2,'reviewed','')", [
      water,
      fish,
    ]);
    await db.query("insert into fishing_reports values($1,$2)", [report, u.owner]);
    await db.query("insert into catches values($1,$2,$3,'Isolated fish')", [
      catchId,
      u.owner,
      report,
    ]);
    await db.query("insert into report_photos values($1,$2,$3,'safe.jpg',now())", [
      photo,
      u.owner,
      report,
    ]);
    await db.exec("begin");
    await actAsFixture(db, "", "anon");
    expect((await db.query("select * from atlas_waterbodies")).rows).toHaveLength(0);
    await db.exec("rollback");
    await db.query("update atlas_waterbodies set is_published=true where id=$1", [water]);
    await db.exec("begin");
    await actAsFixture(db, u.owner);
    await db.query(
      "insert into atlas_catch_claims(user_id,waterbody_id,species_id,catch_id,evidence_photo_id) values($1,$2,$3,$4,$5)",
      [u.owner, water, fish, catchId, photo],
    );
    expect(
      (await db.query("select caught_species,atlas_completed from my_atlas_progress")).rows,
    ).toEqual([{ caught_species: 0, atlas_completed: false }]);
    await db.exec("savepoint denied");
    await expect(db.exec("update atlas_catch_claims set status='verified'")).rejects.toMatchObject({
      code: "42501",
    });
    await db.exec("rollback to denied");
    await actAsFixture(db, u.outsider);
    expect((await db.query("select id from atlas_catch_claims")).rows).toHaveLength(0);
    await db.exec("savepoint forge");
    await expect(
      db.query(
        "insert into atlas_catch_claims(user_id,waterbody_id,species_id,catch_id,evidence_photo_id) values($1,$2,$3,$4,$5)",
        [u.outsider, water, fish, catchId, photo],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec("rollback to forge");
    expect((await db.query("select caught_species from my_atlas_progress")).rows).toEqual([
      { caught_species: 0 },
    ]);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
}, 30000);
