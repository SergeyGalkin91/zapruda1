-- ZAPRUDA: structured tackle cabinet + guide real-time sonar attributes.
-- Users can keep several rods, reels, lines and lures; details are private.
create table if not exists public.angler_gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gear_type text not null check (gear_type in ('rod','reel','line','lure','other')),
  brand text not null check (char_length(btrim(brand)) between 1 and 80),
  model text not null check (char_length(btrim(model)) between 1 and 150),
  variant text not null default '' check (char_length(variant) <= 100),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists angler_gear_owner_type_idx on public.angler_gear(user_id,gear_type);
alter table public.angler_gear enable row level security;
drop policy if exists "Anglers read own tackle" on public.angler_gear;
create policy "Anglers read own tackle" on public.angler_gear
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Anglers add own tackle" on public.angler_gear;
create policy "Anglers add own tackle" on public.angler_gear
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Anglers change own tackle" on public.angler_gear;
create policy "Anglers change own tackle" on public.angler_gear
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "Anglers delete own tackle" on public.angler_gear;
create policy "Anglers delete own tackle" on public.angler_gear
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.angler_gear from anon,authenticated;
grant select,insert,update,delete on public.angler_gear to authenticated;

-- Forward-looking imaging is intentionally separate from a classic sonar.
-- Device details are supplied by the guide, without third-party verification.
alter table public.guide_profiles
  add column if not exists live_sonar_system text not null default 'Нет'
    check (live_sonar_system in ('Нет','Garmin Panoptix','Garmin LiveScope','Другая система')),
  add column if not exists live_sonar_model text not null default ''
    check (char_length(live_sonar_model) <= 180);

alter table public.partner_trips
  add column if not exists live_sonar_system text not null default 'Нет'
    check (live_sonar_system in ('Нет','Garmin Panoptix','Garmin LiveScope','Другая система')),
  add column if not exists live_sonar_model text not null default ''
    check (char_length(live_sonar_model) <= 180);

comment on table public.angler_gear is 'Private, structured user tackle collection. No public read access.';
comment on column public.partner_trips.live_sonar_system is
  'Guide-supplied forward-looking sonar; not verified. Captured on trip publication.';
