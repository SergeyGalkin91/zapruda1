// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  actAsFixture,
  applySqlFile,
  createIsolatedPostgres,
  fixtureUsers as users,
} from "../test/isolated-postgres";

let db: PGlite;
const report = "10000000-0000-4000-8000-000000000001";
const privateReport = "10000000-0000-4000-8000-000000000002";
const rawPhoto = "20000000-0000-4000-8000-000000000001";
const cleanPhoto = "20000000-0000-4000-8000-000000000002";
const privatePhoto = "20000000-0000-4000-8000-000000000003";
const geoMigration = "migrations/20261103180100_report_exact_location_guard.sql";
const photoMigration = "migrations/20261103180000_report_photo_privacy.sql";
const storageMigration = "migrations/20261103180200_report_photo_storage_boundary.sql";
const path = (id = cleanPhoto, r = report) => `${users.owner}/${r}/${id}.jpg`;
async function addPhoto(id: string, r = report, safe = true) {
  return db.query(
    `insert into public.report_photos(id,report_id,user_id,storage_path,sanitized_path,sanitized_at)
    values($1,$2,$3,$4,$5,case when $5::text is not null then now() end)`,
    [id, r, users.owner, path(id, r), safe ? path(id, r) : null],
  );
}
beforeAll(async () => {
  db = await createIsolatedPostgres();
  await db.exec(`
    create table public.fishing_reports(id uuid primary key, user_id uuid references auth.users(id) not null,
      is_public boolean not null default true, latitude double precision,longitude double precision,
      approximate_latitude double precision,approximate_longitude double precision);
    alter table public.fishing_reports enable row level security;
    grant select on public.fishing_reports to anon,authenticated;
    create policy visible on public.fishing_reports for select to anon,authenticated using(is_public or user_id=auth.uid());
    create policy own_update on public.fishing_reports for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    create table public.report_private_locations(report_id uuid primary key references public.fishing_reports(id),
      user_id uuid not null references auth.users(id),latitude double precision not null,longitude double precision not null);
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(path text) returns text[] language sql immutable as $$
      select (string_to_array(path,'/'))[1:array_length(string_to_array(path,'/'),1)-1] $$;
    grant usage on schema storage to anon,authenticated,service_role;
    grant all on storage.objects,storage.buckets to anon,authenticated,service_role;
    alter table storage.objects enable row level security;
    -- Deliberately broad legacy policy: the new restrictive boundaries must win.
    create policy legacy_allow_all on storage.objects for all to anon,authenticated using(true) with check(true);
  `);
  await applySqlFile(db, photoMigration);
  await applySqlFile(db, storageMigration);
  await db.exec(
    "create policy legacy_metadata_delete on public.report_photos for delete to authenticated using(true)",
  );
  await applySqlFile(db, geoMigration);
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
  await db.query(
    "insert into public.fishing_reports(id,user_id,is_public) values($1,$3,true),($2,$3,false)",
    [report, privateReport, users.owner],
  );
  await addPhoto(rawPhoto, report, false);
  await addPhoto(cleanPhoto);
  await addPhoto(privatePhoto, privateReport);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('report-photos',$1),('report-photo-derivatives',$2),('report-photo-derivatives',$3)",
    [path(rawPhoto), path(), path(privatePhoto, privateReport)],
  );
  await db.query("insert into public.report_private_locations values($1,$2,1.234567,4.567891)", [
    report,
    users.owner,
  ]);
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  if (db) await db.close();
});

describe("Report privacy: real PostgreSQL policies, disconnected synthetic identities", () => {
  it.each(["anon", "authenticated"])(
    "%s sees only sanitized public rows and objects",
    async (role) => {
      await actAsFixture(db, users.outsider, role);
      expect((await db.query("select id from public.report_photos")).rows).toEqual([
        { id: cleanPhoto },
      ]);
      expect((await db.query("select name from storage.objects")).rows).toEqual([{ name: path() }]);
    },
  );
  it("owner retains access to their original and private derivatives", async () => {
    await actAsFixture(db, users.owner);
    expect((await db.query("select id from public.report_photos")).rows).toHaveLength(3);
    expect((await db.query("select name from storage.objects")).rows).toHaveLength(3);
  });
  it("stranger cannot read exact private GPS", async () => {
    await actAsFixture(db, users.outsider);
    expect((await db.query("select * from public.report_private_locations")).rows).toEqual([]);
  });
  it("anonymous role lacks private-table privileges", async () => {
    await actAsFixture(db, "", "anon");
    await expect(db.query("select * from public.report_private_locations")).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("owner can read and change their separate private GPS", async () => {
    await actAsFixture(db, users.owner);
    expect(
      (
        await db.query(
          "update public.report_private_locations set latitude=2.34 returning report_id",
        )
      ).rows,
    ).toEqual([{ report_id: report }]);
  });
  it("cannot put private GPS under someone else's report", async () => {
    await db.query("delete from public.report_private_locations where report_id=$1", [report]);
    await actAsFixture(db, users.outsider);
    await expect(
      db.query("insert into public.report_private_locations values($1,$2,1,2)", [
        report,
        users.outsider,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("owner cannot forge the trusted sanitization marker", async () => {
    await actAsFixture(db, users.owner);
    await expect(
      db.query(
        "update public.report_photos set sanitized_path=storage_path,sanitized_at=now() where id=$1",
        [rawPhoto],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("owner cannot bypass the endpoint by INSERTing photo metadata", async () => {
    await actAsFixture(db, users.owner);
    await expect(addPhoto("20000000-0000-4000-8000-000000000004")).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("broad legacy Storage grants do not permit direct derivative uploads", async () => {
    await actAsFixture(db, users.owner);
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name) values('report-photo-derivatives',$1)",
        [path()],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("derivative cannot be replaced or renamed through direct Storage UPDATE", async () => {
    await actAsFixture(db, users.owner);
    expect(
      (
        await db.query(
          "update storage.objects set name='forged.jpg' where bucket_id='report-photo-derivatives' returning name",
        )
      ).rows,
    ).toEqual([]);
  });
  it("new access to a derivative stops after its report becomes private", async () => {
    await actAsFixture(db, users.owner);
    await db.query("update public.fishing_reports set is_public=false where id=$1", [report]);
    await actAsFixture(db, "", "anon");
    expect((await db.query("select * from public.report_photos")).rows).toEqual([]);
    expect((await db.query("select * from storage.objects")).rows).toEqual([]);
  });
  it("a stranger cannot delete another user's metadata through a legacy policy", async () => {
    await actAsFixture(db, users.outsider);
    expect((await db.query("delete from public.report_photos returning id")).rows).toEqual([]);
  });
  it("a stranger cannot steal an original by renaming its storage path", async () => {
    await actAsFixture(db, users.outsider);
    expect(
      (
        await db.query(
          "update storage.objects set name=$1 where bucket_id='report-photos' returning name",
          [`${users.outsider}/${report}/stolen.jpg`],
        )
      ).rows,
    ).toEqual([]);
  });
  it("a stranger cannot delete originals or trusted derivatives", async () => {
    await actAsFixture(db, users.outsider);
    expect((await db.query("delete from storage.objects returning name")).rows).toEqual([]);
  });
  it("owner retains original deletion but cannot tamper with trusted derivative objects", async () => {
    await actAsFixture(db, users.owner);
    expect((await db.query("delete from storage.objects returning bucket_id")).rows).toEqual([
      { bucket_id: "report-photos" },
    ]);
  });
  it("public SELECT * physically contains no exact coordinates", async () => {
    await actAsFixture(db, "", "anon");
    expect((await db.query("select latitude,longitude from public.fishing_reports")).rows).toEqual([
      { latitude: null, longitude: null },
    ]);
  });
  it.each([
    [1, 2],
    [1, null],
    [null, 2],
  ])("rejects legacy public coordinate write %s/%s", async (lat, lon) => {
    await actAsFixture(db, users.owner);
    await expect(
      db.query("update public.fishing_reports set latitude=$1,longitude=$2 where id=$3", [
        lat,
        lon,
        report,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("preserves a complete legacy pair before nulling public fields", async () => {
    await db.query("delete from public.report_private_locations where report_id=$1", [report]);
    await db.exec(
      "alter table public.fishing_reports drop constraint fishing_reports_no_exact_public_columns",
    );
    await db.query("update public.fishing_reports set latitude=3.21,longitude=6.54 where id=$1", [
      report,
    ]);
    await applySqlFile(db, geoMigration);
    expect(
      (await db.query("select latitude,longitude from public.report_private_locations")).rows,
    ).toEqual([{ latitude: 3.21, longitude: 6.54 }]);
    expect(
      (
        await db.query("select latitude,longitude from public.fishing_reports where id=$1", [
          report,
        ])
      ).rows,
    ).toEqual([{ latitude: null, longitude: null }]);
  });
  it("reapplying migrations does not mark legacy photos sanitized", async () => {
    await applySqlFile(db, photoMigration);
    await applySqlFile(db, storageMigration);
    await applySqlFile(db, geoMigration);
    expect(
      (await db.query("select sanitized_path from public.report_photos where id=$1", [rawPhoto]))
        .rows,
    ).toEqual([{ sanitized_path: null }]);
  });
  it("cannot publish an original filename as sanitized photo metadata", async () => {
    await db.query("update public.report_photos set storage_path=$1 where id=$2", [
      `${users.owner}/${report}/PRIVATE_GPS_FILENAME.jpg`,
      rawPhoto,
    ]);
    await expect(
      db.query("update public.report_photos set sanitized_path=$1,sanitized_at=now() where id=$2", [
        path(rawPhoto),
        rawPhoto,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("refuses conflicting legacy GPS without losing either value", async () => {
    await db.exec(
      "alter table public.fishing_reports drop constraint fishing_reports_no_exact_public_columns",
    );
    await db.query("update public.fishing_reports set latitude=3.21,longitude=6.54 where id=$1", [
      report,
    ]);
    await db.exec("savepoint migration_review");
    await expect(applySqlFile(db, geoMigration)).rejects.toThrow(/conflicting private GPS/);
    await db.exec("rollback to savepoint migration_review");
    expect(
      (await db.query("select latitude from public.fishing_reports where id=$1", [report])).rows,
    ).toEqual([{ latitude: 3.21 }]);
    expect(
      (
        await db.query("select latitude from public.report_private_locations where report_id=$1", [
          report,
        ])
      ).rows,
    ).toEqual([{ latitude: 1.234567 }]);
  });
  it("server registration enforces six photos", async () => {
    for (let i = 4; i <= 7; i++) await addPhoto(`20000000-0000-4000-8000-00000000000${i}`);
    await expect(addPhoto("20000000-0000-4000-8000-000000000008")).rejects.toMatchObject({
      code: "23514",
    });
  });
  it("even a server write cannot reparent existing photo identity", async () => {
    await expect(
      db.query("update public.report_photos set user_id=$1 where id=$2", [
        users.outsider,
        cleanPhoto,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
