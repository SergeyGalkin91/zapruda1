import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const project = "yudtbifopfnjtjanaqrd";
const version = "20261105044404";
const name = "v076_on_spot_social_privacy";
const membershipVersion = "20261105043101";
const membershipHash = "4d6e5d18c2cb10c7ed4b28e4d66acf2ebd8008b776aae034766121f655f7689b";
const migrationHash = "194e9b0606071a674cd15b44631c062d21aab657af0cb639e1f3459b2c57e16e";
const rollbackHash = "a2bf661bf6e7e9666880f2600f2aee3abb472b063393d9a8b2a53272c52b6222";
const rollbackPath = "rollback_v076_on_spot_social_privacy.sql";
const source = readFileSync(new URL(`../supabase/staging/${version}_${name}.sql`, import.meta.url));
const rollback = readFileSync(new URL(`../supabase/staging/${rollbackPath}`, import.meta.url));
const digest = (data) => createHash("sha256").update(data).digest("hex");

if (digest(source) !== migrationHash || digest(rollback) !== rollbackHash) {
  throw new Error("Migration or shutdown script differs from the reviewed bytes");
}

// PostgreSQL's Base64 decoder ignores LF, CRLF and whitespace between payload characters.
const payload = source.toString("base64").replace(/.{76}(?=.)/g, "$&\n");

const managementApi = process.argv[2] === "--management-api";
const transactionStart = managementApi
  ? "-- Supabase Management API bundle | one atomic statement\n"
  : `-- ZAPRUDA ON SPOT+ | STAGING project ${project} only
-- SQL Editor bundle v2 | Windows LF and CRLF supported
-- Run the entire file once in that project's SQL Editor after operator review.
-- Source ${version}_${name}.sql
-- Source SHA-256 ${migrationHash}
-- Emergency shutdown ${rollbackPath}
-- Shutdown SHA-256 ${rollbackHash}
-- The shutdown retains consent barriers and is kept outside this forward transaction.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local search_path = pg_catalog;

`;
const blockSetup = managementApi
  ? `  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('search_path', 'pg_catalog', true);

`
  : "";
const transactionEnd = managementApi
  ? ""
  : `
commit;

select 'STAGING_APPLIED' as status, version, name,
       encode(sha256(convert_to(statements[1], 'UTF8')), 'hex') as sha256
from supabase_migrations.schema_migrations
where version = '${version}' and name = '${name}';
`;

process.stdout.write(`${transactionStart}do $zapruda_apply_social$
declare
  migration_bytes constant bytea := ${managementApi ? "pg_catalog.decode" : "decode"}($zapruda_reviewed_base64$
${payload}
$zapruda_reviewed_base64$, 'base64');
  migration_sql text;
  private_tables constant text[] := array[
    'preferences','presences','closed_presence_sessions','blocks','invitations',
    'announcements','deliveries','photo_shares','photo_consents','abuse_reports','events'
  ];
  missing_dependency text;
begin
${blockSetup}  if current_database() <> 'postgres' or current_user <> 'postgres' then
    raise exception 'Expected the STAGING ${managementApi ? "" : "SQL Editor "}postgres role';
  end if;

  lock table supabase_migrations.schema_migrations in share row exclusive mode;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '${membershipVersion}' and name = 'v076_on_spot_zone_membership'
      and cardinality(statements) = 1
      and encode(sha256(convert_to(statements[1], 'UTF8')), 'hex') = '${membershipHash}'
  ) then
    raise exception 'Expected STAGING membership fingerprint is missing';
  end if;

  if exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '${version}' or name = '${name}'
  ) or exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'zc_osp_internal'
      and (c.relname = any(private_tables) or c.relname = 'community_zone_reviews')
  ) or to_regprocedure('public.zc_osp_social(text,uuid,jsonb)') is not null
    or to_regprocedure('public.zc_osp_shared_photo_access(uuid)') is not null then
    raise exception 'Social privacy history or schema already exists; stop and reconcile';
  end if;

  select format('%s.%s', d.relation, d.column_name) into missing_dependency
  from (values
    ('auth.users','email_confirmed_at','timestamptz'),
    ('auth.users','is_anonymous','boolean'),
    ('auth.sessions','id','uuid'),
    ('auth.sessions','user_id','uuid'),
    ('auth.sessions','not_after','timestamptz'),
    ('public.chat_messages','place_id','uuid'),
    ('public.chat_messages','user_id','uuid'),
    ('public.profiles','username','text'),
    ('public.profiles','display_name','text'),
    ('public.social_threads','requester_id','uuid'),
    ('public.social_threads','recipient_id','uuid'),
    ('public.social_threads','status','text'),
    ('public.social_messages','thread_id','uuid'),
    ('public.meetup_posts','owner_id','uuid'),
    ('public.report_photos','sanitized_path','text'),
    ('public.report_photos','sanitized_at','timestamptz'),
    ('public.fishing_reports','is_public','boolean'),
    ('public.zc_public_spots','reviewed_at','timestamptz'),
    ('zc_osp_internal.zones','source_spot_id','uuid'),
    ('zc_osp_internal.memberships','user_id','uuid'),
    ('zc_osp_internal.bans','user_id','uuid')
  ) d(relation, column_name, column_type)
  where not exists (
    select 1 from pg_attribute a
    where a.attrelid = to_regclass(d.relation) and a.attname = d.column_name
      and a.atttypid = d.column_type::regtype and a.attnum > 0 and not a.attisdropped
  )
  limit 1;

  if missing_dependency is not null then
    raise exception 'STAGING dependency is missing or has the wrong type: %', missing_dependency;
  end if;
  if to_regprocedure('auth.jwt()') is null
    or to_regprocedure('zc_osp_internal.require_actor()') is null
    or not exists (
      select 1 from pg_constraint
      where conrelid = 'public.social_threads'::regclass and contype = 'u' and not condeferrable
        and pg_get_constraintdef(oid) = 'UNIQUE (requester_id, recipient_id)'
    ) then
    raise exception 'Expected Auth, membership and DM prerequisites';
  end if;
  if encode(sha256(migration_bytes), 'hex') <> '${migrationHash}' then
    raise exception 'Reviewed migration SHA-256 does not match this script';
  end if;

  migration_sql := convert_from(migration_bytes, 'UTF8');
  execute migration_sql;

  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'zc_osp_internal' and c.relname = any(private_tables)
        and c.relkind = 'r' and c.relrowsecurity
        and not has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
        and not has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'))
      <> cardinality(private_tables)
    or has_function_privilege('anon', 'public.zc_osp_social(text,uuid,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.zc_osp_shared_photo_access(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.zc_osp_social(text,uuid,jsonb)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.zc_osp_shared_photo_access(uuid)', 'EXECUTE') then
    raise exception 'STAGING social privacy ACL postcheck failed';
  end if;

  insert into supabase_migrations.schema_migrations(version, name, statements)
  values ('${version}', '${name}', array[migration_sql]);
end
$zapruda_apply_social$;
${transactionEnd}`);
