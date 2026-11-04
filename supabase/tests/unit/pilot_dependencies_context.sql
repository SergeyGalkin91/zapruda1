-- DISPOSABLE CLONE ONLY, never execute against Supabase.
alter table auth.users add column email_confirmed_at timestamptz default now(),
      add column is_anonymous boolean default false;
    create schema zapruda_internal;
    create table public.angler_preferences(user_id uuid primary key references public.profiles(id),
      home_country_code text default 'RU',home_region text default '',home_city text default '');
    insert into public.angler_preferences(user_id) select id from public.profiles;
    create table public.fishing_reports(id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.profiles(id),title text not null,
      body text,location_name text,weather_summary text,air_temperature_c numeric,
      pressure_hpa numeric,wind_direction text,wind_speed_ms numeric,
      is_public boolean not null default true,fishing_method text,created_at timestamptz not null default now(),
      latitude double precision,longitude double precision);
    alter table public.fishing_reports enable row level security;
    revoke all on public.fishing_reports from anon,authenticated;
    grant select(id,user_id,title,is_public,created_at,fishing_method,location_name) on public.fishing_reports to anon,authenticated;
    grant insert,delete on public.fishing_reports to authenticated;
    grant update(is_public) on public.fishing_reports to authenticated;
    create policy read_reports on public.fishing_reports for select to anon,authenticated
      using(is_public or user_id=(select auth.uid()));
    create policy write_reports on public.fishing_reports for insert to authenticated with check(user_id=(select auth.uid()));
    create policy edit_reports on public.fishing_reports for update to authenticated
      using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
    create policy delete_reports on public.fishing_reports for delete to authenticated using(user_id=(select auth.uid()));
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant all on storage.objects,storage.buckets to anon,authenticated,service_role;
    create policy legacy_broad_storage on storage.objects for all to anon,authenticated using(true) with check(true);
    grant select on public.profiles to authenticated;
    create table public.report_photos(id uuid primary key,report_id uuid,user_id uuid);
    create table public.reactions(id uuid primary key,report_id uuid,user_id uuid);
    create table public.partner_trips(id uuid primary key,organizer_id uuid);
