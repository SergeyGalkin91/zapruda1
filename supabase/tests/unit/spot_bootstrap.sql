-- ISOLATED TEST DATABASE ONLY. Never apply to a Supabase/hosted project.
-- All identities, evidence metadata and locations below are disconnected fixtures.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('test.user_id',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
insert into auth.users values
 ('00000000-0000-4000-8000-000000000001',now()),
 ('00000000-0000-4000-8000-000000000002',now()),
 ('00000000-0000-4000-8000-000000000003',now()),
 ('00000000-0000-4000-8000-000000000004',now());
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,is_delete_marker boolean not null default false,unique(bucket_id,name));
grant usage on schema storage to service_role;
grant all on storage.objects,storage.buckets to service_role;
