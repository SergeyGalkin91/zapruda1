import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A disconnected, in-memory PostgreSQL fixture. These identities are invented UUIDs.
// No Supabase URL, real Auth user, password, session or JWT is used by these tests.
export const fixtureUsers = {
  owner: "00000000-0000-4000-8000-000000000001",
  captain: "00000000-0000-4000-8000-000000000002",
  outsider: "00000000-0000-4000-8000-000000000003",
  fourth: "00000000-0000-4000-8000-000000000004",
};

export async function createIsolatedPostgres() {
  const db = await PGlite.create();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table public.profiles(id uuid primary key references auth.users(id));
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.user_id', true), '')::uuid
    $$;
    create function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('test.role', true), ''), '')
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
    -- Match the broad table defaults observed on STAGING, then exercise migrations.
    alter default privileges in schema public grant all on tables to authenticated, service_role;
    alter default privileges in schema public grant all on functions to service_role;
  `);
  for (const id of Object.values(fixtureUsers)) {
    await db.query("insert into auth.users(id) values($1)", [id]);
    await db.query("insert into public.profiles(id) values($1)", [id]);
  }
  return db;
}

export async function applySqlFile(db: PGlite, path: string) {
  const source = readFileSync(join(process.cwd(), "supabase", path), "utf8");
  if (source.trim()) await db.exec(source);
}

export async function actAsFixture(db: PGlite, userId: string, role = "authenticated") {
  if (!["authenticated", "anon", "service_role"].includes(role))
    throw new Error("Unknown fixture role");
  await db.exec(`reset role; set local role ${role}`);
  await db.query("select set_config('test.user_id', $1, true), set_config('test.role', $2, true)", [
    userId,
    role,
  ]);
}
