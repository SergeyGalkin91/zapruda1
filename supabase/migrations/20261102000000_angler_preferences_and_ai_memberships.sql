-- ZAPRUDA: private fishing preferences and server-only AI entitlements.
-- These changes do not alter existing public.profiles, accounts or reports.
create table if not exists public.angler_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  home_city text not null default '' check (char_length(home_city) <= 100),
  home_region text not null default '' check (char_length(home_region) <= 120),
  main_technique text not null default 'Спиннинг'
    check (main_technique in ('Спиннинг','Фидер','Поплавок','Нахлыст','Зимняя рыбалка','Другое')),
  target_species text[] not null default array[]::text[]
    check (cardinality(target_species) <= 10),
  fishing_access text not null default 'Берег'
    check (fishing_access in ('Берег','Лодка','Берег и лодка')),
  transport text not null default 'Без машины'
    check (transport in ('Без машины','Есть машина','Общественный транспорт','Любой')),
  favorite_lures text not null default '' check (char_length(favorite_lures) <= 800),
  tackle_text text not null default '' check (char_length(tackle_text) <= 1600),
  preferred_water text not null default '' check (char_length(preferred_water) <= 500),
  fishing_notes text not null default '' check (char_length(fishing_notes) <= 800),
  search_radius_km integer not null default 30 check (search_radius_km between 1 and 300),
  updated_at timestamptz not null default now()
);
alter table public.angler_preferences enable row level security;
drop policy if exists "Owners read fishing preferences" on public.angler_preferences;
create policy "Owners read fishing preferences"
  on public.angler_preferences for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Owners create fishing preferences" on public.angler_preferences;
create policy "Owners create fishing preferences"
  on public.angler_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Owners update fishing preferences" on public.angler_preferences;
create policy "Owners update fishing preferences"
  on public.angler_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.angler_preferences from anon;
grant select, insert, update on public.angler_preferences to authenticated;

-- Future checkout integration must grant access from a verified server-side
-- payment notification. Clients cannot create or extend their own paid access.
create table if not exists public.ai_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  active_until timestamptz not null,
  updated_at timestamptz not null default now(),
  payment_reference text unique
);
alter table public.ai_memberships enable row level security;
drop policy if exists "Users read own AI membership" on public.ai_memberships;
create policy "Users read own AI membership"
  on public.ai_memberships for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.ai_memberships from anon, authenticated;
grant select on public.ai_memberships to authenticated;
comment on table public.ai_memberships is
  'Server-managed AI access. Only grant or renew after verified payment webhook. No client writes.';
