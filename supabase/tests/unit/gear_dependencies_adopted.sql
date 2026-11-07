-- DISPOSABLE TEST BASELINE ONLY. STAGING 20261104002109, NEVER replay hosted.
-- ZAPRUDA COMMUNITY: staging-only gear/profile dependency patch.
-- Apply ONLY to Supabase STAGING yudtbifopfnjtjanaqrd.
-- Do not put this file under automatic production migrations.
-- DDL verified against read-only metadata of production; no user data copied.

create table public.angler_gear (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 gear_type text not null check (gear_type in ('rod','reel','line','lure','other')),
 brand text not null check (char_length(btrim(brand)) between 1 and 80),
 model text not null check (char_length(btrim(model)) between 1 and 150),
 variant text not null default '' check(char_length(variant)<=100),
 notes text not null default '' check(char_length(notes)<=500),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index angler_gear_owner_type_idx on public.angler_gear(user_id,gear_type);

create table public.angler_gear_sets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null default '' check(char_length(title)<=100),
 fishing_method text not null default '' check(char_length(fishing_method)<=80),
 rod_id uuid not null references public.angler_gear(id) on delete cascade,
 reel_id uuid not null references public.angler_gear(id) on delete cascade,
 line_id uuid references public.angler_gear(id) on delete set null,
 notes text not null default '' check(char_length(notes)<=500),
 is_primary boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint gear_sets_distinct_ids check (
   rod_id<>reel_id
   and (line_id is null or (line_id<>rod_id and line_id<>reel_id))
 )
);
create index gear_sets_user_created on public.angler_gear_sets(user_id,created_at desc);
create index idx_fk_angler_gear_sets_rod_id on public.angler_gear_sets(rod_id);
create index idx_fk_angler_gear_sets_reel_id on public.angler_gear_sets(reel_id);
create index idx_fk_angler_gear_sets_line_id on public.angler_gear_sets(line_id);
create unique index only_one_main_gear_set_per_user on public.angler_gear_sets(user_id) where is_primary;

alter table public.angler_gear enable row level security;
alter table public.angler_gear_sets enable row level security;
-- Supabase defaults can contain broad API grants: revoke before regrant.
revoke all privileges on public.angler_gear,public.angler_gear_sets from public,anon,authenticated;
grant select,insert,update,delete on public.angler_gear,public.angler_gear_sets to authenticated;

create policy "staging_gear_owner_read" on public.angler_gear
 for select to authenticated using (user_id=(select auth.uid()));
create policy "staging_gear_owner_insert" on public.angler_gear
 for insert to authenticated with check (user_id=(select auth.uid()));
create policy "staging_gear_owner_update" on public.angler_gear
 for update to authenticated using (user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "staging_gear_owner_delete" on public.angler_gear
 for delete to authenticated using(user_id=(select auth.uid()));

create policy "staging_gear_sets_owner_read" on public.angler_gear_sets
 for select to authenticated using(user_id=(select auth.uid()));
create policy "staging_gear_sets_owner_insert" on public.angler_gear_sets
 for insert to authenticated with check (
  user_id=(select auth.uid()) and is_primary=false
  and exists(select 1 from public.angler_gear g where g.id=rod_id and g.user_id=(select auth.uid()) and g.gear_type='rod')
  and exists(select 1 from public.angler_gear g where g.id=reel_id and g.user_id=(select auth.uid()) and g.gear_type='reel')
  and (line_id is null or exists(select 1 from public.angler_gear g where g.id=line_id and g.user_id=(select auth.uid()) and g.gear_type='line'))
 );
create policy "staging_gear_sets_owner_update" on public.angler_gear_sets
 for update to authenticated using(user_id=(select auth.uid())) with check (
  user_id=(select auth.uid())
  and exists(select 1 from public.angler_gear g where g.id=rod_id and g.user_id=(select auth.uid()) and g.gear_type='rod')
  and exists(select 1 from public.angler_gear g where g.id=reel_id and g.user_id=(select auth.uid()) and g.gear_type='reel')
  and (line_id is null or exists(select 1 from public.angler_gear g where g.id=line_id and g.user_id=(select auth.uid()) and g.gear_type='line'))
 );
create policy "staging_gear_sets_owner_delete" on public.angler_gear_sets
 for delete to authenticated using(user_id=(select auth.uid()));

-- Stronger than the production baseline: cross-user gear sets must be
-- independently prevented through authenticated RLS; service_role imports
-- require separate audit. No fixtures inserted here.
