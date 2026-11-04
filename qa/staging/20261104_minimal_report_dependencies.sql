-- STAGING-ONLY PATCH. Do NOT add to automatic production migration chain.
-- Intended exclusively for Supabase project yudtbifopfnjtjanaqrd.
-- Source comparison: read-only production DDL inspection, 2026-11-04.
-- Deliberate hard failure if the objects already exist: inspect drift first.
create table public.catches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fishing_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  species text not null,
  weight_kg numeric check (weight_kg is null or weight_kg > 0),
  length_cm numeric check (length_cm is null or length_cm > 0),
  lure text,
  technique text,
  photo_url text,
  created_at timestamptz not null default now()
);
create index catches_report_id_idx on public.catches(report_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fishing_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index comments_report_created_idx on public.comments(report_id,created_at);

alter table public.catches enable row level security;
alter table public.comments enable row level security;

-- Supabase default grants can be broad. Strip them BEFORE applying
-- narrowly scoped column permissions (verified in live STAGING).
revoke all privileges on public.catches, public.comments
 from PUBLIC, anon, authenticated;

-- SECURITY: do NOT grant SELECT of catches.photo_url to API users:
-- the existing photo gateway is the approved way to serve sanitized media.
-- Column-granular API grants intentionally tighten production's historical broad grants.
grant select (id,report_id,user_id,species,weight_kg,length_cm,lure,technique,created_at)
 on public.catches to anon,authenticated;
grant insert (report_id,user_id,species,weight_kg,length_cm,lure,technique)
 on public.catches to authenticated;
grant select (id,report_id,user_id,body,created_at)
 on public.comments to anon,authenticated;
grant insert (report_id,user_id,body) on public.comments to authenticated;

create policy "staging_catches_visible_report" on public.catches
 for select to anon, authenticated
 using (exists (
   select 1 from public.fishing_reports r
   where r.id = catches.report_id
   and (r.is_public is true or r.user_id = (select auth.uid()))
 ));
create policy "staging_catches_owner_create" on public.catches
 for insert to authenticated
 with check (
   user_id = (select auth.uid())
   and exists (select 1 from public.fishing_reports r
     where r.id = catches.report_id and r.user_id = (select auth.uid()))
 );

create policy "staging_comments_visible_report" on public.comments
 for select to anon, authenticated
 using (exists (
   select 1 from public.fishing_reports r
   where r.id = comments.report_id
   and (r.is_public is true or r.user_id = (select auth.uid()))
 ));
create policy "staging_comments_on_public_report" on public.comments
 for insert to authenticated
 with check (
   user_id = (select auth.uid())
   and exists (select 1 from public.fishing_reports r
      where r.id = comments.report_id and r.is_public is true)
 );
-- No UPDATE or DELETE grants/policies. New tables are empty.
