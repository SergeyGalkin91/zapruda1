-- STAGING CORE ONLY. Not complete production schema. Do not apply to production.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique,
 display_name text,
 avatar_url text,
 bio text,
 created_at timestamptz not null default now(),
 chat_city text,
 avatar_symbol text
);
create table if not exists public.fishing_reports (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 body text,
 location_name text,
 approximate_latitude double precision,
 approximate_longitude double precision,
 water_type text,
 weather_summary text,
 pressure_hpa numeric,
 air_temperature_c numeric,
 wind_speed_ms numeric,
 wind_direction text,
 is_public boolean not null default true,
 created_at timestamptz not null default now(),
 latitude double precision,
 longitude double precision,
 fishing_method text,
 constraint fishing_reports_no_exact_public_columns check (latitude is null and longitude is null)
);
create table if not exists public.report_private_locations (
 report_id uuid primary key references public.fishing_reports(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 latitude double precision not null check (latitude between -90 and 90),
 longitude double precision not null check (longitude between -180 and 180),
 created_at timestamptz not null default now()
);
create table if not exists public.reactions (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.fishing_reports(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction_type text not null default 'like',
 created_at timestamptz not null default now(),
 unique(report_id,user_id,reaction_type)
);
create table if not exists public.angler_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 home_city text not null default '',
 home_region text not null default '',
 main_technique text not null default 'Спиннинг',
 target_species text[] not null default '{}',
 fishing_access text not null default 'Берег',
 transport text not null default 'Без машины',
 favorite_lures text not null default '',
 tackle_text text not null default '',
 preferred_water text not null default '',
 fishing_notes text not null default '',
 search_radius_km integer not null default 30,
 updated_at timestamptz not null default now(),
 fishing_methods text[] not null default array['Спиннинг'],
 home_country_code text not null default 'RU'
);
alter table public.profiles enable row level security;
alter table public.fishing_reports enable row level security;
alter table public.report_private_locations enable row level security;
alter table public.reactions enable row level security;
alter table public.angler_preferences enable row level security;
revoke all on public.profiles,public.fishing_reports,public.report_private_locations,public.reactions,public.angler_preferences from anon,authenticated;
grant select(id,username,display_name,avatar_url,bio,created_at,chat_city,avatar_symbol) on public.profiles to anon,authenticated;
grant update(username,display_name,avatar_url,bio,chat_city,avatar_symbol) on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant select(id,user_id,title,body,location_name,approximate_latitude,approximate_longitude,water_type,weather_summary,pressure_hpa,air_temperature_c,wind_speed_ms,wind_direction,is_public,created_at,fishing_method) on public.fishing_reports to anon,authenticated;
grant insert(id,user_id,title,body,location_name,approximate_latitude,approximate_longitude,water_type,weather_summary,pressure_hpa,air_temperature_c,wind_speed_ms,wind_direction,is_public,created_at,fishing_method) on public.fishing_reports to authenticated;
grant update(title,body,location_name,approximate_latitude,approximate_longitude,water_type,weather_summary,pressure_hpa,air_temperature_c,wind_speed_ms,wind_direction,is_public,fishing_method) on public.fishing_reports to authenticated;
grant delete on public.fishing_reports to authenticated;
grant select,insert,update,delete on public.report_private_locations to authenticated;
grant select on public.reactions to anon,authenticated;
grant insert,delete on public.reactions to authenticated;
grant select,insert,update,delete on public.angler_preferences to authenticated;
create policy "profiles_public_read_staging" on public.profiles for select to anon,authenticated using(true);
create policy "profiles_owner_insert_staging" on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy "profiles_owner_update_staging" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "reports_visible_staging" on public.fishing_reports for select to anon,authenticated using(is_public or user_id=(select auth.uid()));
create policy "reports_owner_insert_staging" on public.fishing_reports for insert to authenticated with check(user_id=(select auth.uid()));
create policy "reports_owner_update_staging" on public.fishing_reports for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "reports_owner_delete_staging" on public.fishing_reports for delete to authenticated using(user_id=(select auth.uid()));
create policy "private_locations_owner_all_staging" on public.report_private_locations for all to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())));
create policy "reactions_visible_staging" on public.reactions for select to anon,authenticated using(exists(select 1 from public.fishing_reports r where r.id=report_id));
create policy "reactions_owner_insert_staging" on public.reactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.fishing_reports r where r.id=report_id));
create policy "reactions_owner_delete_staging" on public.reactions for delete to authenticated using(user_id=(select auth.uid()));
create policy "preferences_owner_all_staging" on public.angler_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
