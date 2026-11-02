-- Stage 6: team competitions foundation (no sponsors required).
-- Apply on STAGING only. Results can be linked to clubs (social_groups).

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1500),
  area_label text not null default '' check (char_length(area_label) <= 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'live', 'finished', 'cancelled')),
  max_teams integer not null default 16 check (max_teams between 2 and 64),
  scoring_mode text not null default 'total_fish'
    check (scoring_mode in ('total_fish', 'total_weight_g', 'biggest_fish_g')),
  created_at timestamptz not null default now(),
  constraint competitions_dates_ok check (ends_at > starts_at)
);

create index if not exists competitions_status_starts_idx
  on public.competitions (status, starts_at desc);

create table if not exists public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  club_id uuid references public.social_groups (id) on delete set null,
  captain_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  status text not null default 'registered'
    check (status in ('registered', 'withdrawn', 'disqualified')),
  created_at timestamptz not null default now(),
  unique (competition_id, name)
);

create index if not exists competition_teams_comp_idx
  on public.competition_teams (competition_id);

create table if not exists public.competition_results (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  team_id uuid not null references public.competition_teams (id) on delete cascade,
  submitted_by uuid not null references auth.users (id) on delete cascade,
  fish_count integer not null default 0 check (fish_count >= 0 and fish_count <= 500),
  total_weight_g integer not null default 0 check (total_weight_g >= 0 and total_weight_g <= 500000),
  biggest_fish_g integer not null default 0 check (biggest_fish_g >= 0 and biggest_fish_g <= 100000),
  note text not null default '' check (char_length(note) <= 400),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (competition_id, team_id)
);

create index if not exists competition_results_comp_idx
  on public.competition_results (competition_id);

alter table public.competitions enable row level security;
alter table public.competition_teams enable row level security;
alter table public.competition_results enable row level security;

drop policy if exists "Read competitions catalog" on public.competitions;
create policy "Read competitions catalog"
  on public.competitions for select to authenticated
  using (status in ('open', 'live', 'finished') or organizer_id = auth.uid());

drop policy if exists "Organizer creates competitions" on public.competitions;
create policy "Organizer creates competitions"
  on public.competitions for insert to authenticated
  with check (organizer_id = auth.uid());

drop policy if exists "Organizer updates competitions" on public.competitions;
create policy "Organizer updates competitions"
  on public.competitions for update to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

drop policy if exists "Read competition teams" on public.competition_teams;
create policy "Read competition teams"
  on public.competition_teams for select to authenticated
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id
        and (c.status in ('open', 'live', 'finished') or c.organizer_id = auth.uid())
    )
  );

drop policy if exists "Captain registers team" on public.competition_teams;
create policy "Captain registers team"
  on public.competition_teams for insert to authenticated
  with check (
    captain_id = auth.uid()
    and exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.status in ('open', 'live')
    )
  );

drop policy if exists "Captain or organizer update team" on public.competition_teams;
create policy "Captain or organizer update team"
  on public.competition_teams for update to authenticated
  using (
    captain_id = auth.uid()
    or exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.organizer_id = auth.uid()
    )
  );

drop policy if exists "Read competition results" on public.competition_results;
create policy "Read competition results"
  on public.competition_results for select to authenticated
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id
        and (c.status in ('open', 'live', 'finished') or c.organizer_id = auth.uid())
    )
  );

drop policy if exists "Captain submits result" on public.competition_results;
create policy "Captain submits result"
  on public.competition_results for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_id = auth.uid() and t.status = 'registered'
    )
    and exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.status in ('live', 'open')
    )
  );

drop policy if exists "Organizer moderates results" on public.competition_results;
create policy "Organizer moderates results"
  on public.competition_results for update to authenticated
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.organizer_id = auth.uid()
    )
  );

create or replace function public.enforce_competition_team_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_t integer;
  cnt integer;
begin
  if new.status is distinct from 'registered' then
    return new;
  end if;
  select max_teams into max_t from public.competitions where id = new.competition_id;
  select count(*)::integer into cnt
  from public.competition_teams
  where competition_id = new.competition_id
    and status = 'registered'
    and (tg_op = 'INSERT' or id is distinct from new.id);
  if cnt >= max_t then
    raise exception 'COMPETITION_FULL: набор команд закрыт'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_competition_team_limit on public.competition_teams;
create trigger trg_competition_team_limit
  before insert or update of status
  on public.competition_teams
  for each row
  execute function public.enforce_competition_team_limit();

grant select, insert, update on public.competitions to authenticated;
grant select, insert, update on public.competition_teams to authenticated;
grant select, insert, update on public.competition_results to authenticated;
