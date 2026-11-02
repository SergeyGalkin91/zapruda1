-- Issue #61-A additive P0 (idempotent re-apply).
-- Requires 20261102160000_team_competitions.sql first.
-- Reinforces FOR UPDATE limit + immutable field guards if baseline already present.

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

  select max_teams into max_t
  from public.competitions
  where id = new.competition_id
  for update;

  if max_t is null then
    raise exception 'COMPETITION_MISSING' using errcode = 'foreign_key_violation';
  end if;

  select count(*)::integer into cnt
  from public.competition_teams
  where competition_id = new.competition_id
    and status = 'registered'
    and (tg_op = 'INSERT' or id is distinct from new.id);

  if cnt >= max_t then
    raise exception 'COMPETITION_FULL: набор команд закрыт' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_competition_team_limit on public.competition_teams;
create trigger trg_competition_team_limit
  before insert or update of status
  on public.competition_teams
  for each row execute function public.enforce_competition_team_limit();

create or replace function public.guard_competition_team_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.competition_id is distinct from old.competition_id then
    raise exception 'COMPETITION_ID_IMMUTABLE' using errcode = '42501';
  end if;
  if new.captain_id is distinct from old.captain_id then
    raise exception 'CAPTAIN_ID_IMMUTABLE' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_competition_team_immutable on public.competition_teams;
create trigger trg_guard_competition_team_immutable
  before update on public.competition_teams
  for each row execute function public.guard_competition_team_immutable();

create or replace function public.guard_competition_result_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.competition_id is distinct from old.competition_id then
    raise exception 'RESULT_COMPETITION_ID_IMMUTABLE' using errcode = '42501';
  end if;
  if new.team_id is distinct from old.team_id then
    raise exception 'RESULT_TEAM_ID_IMMUTABLE' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_competition_result_immutable on public.competition_results;
create trigger trg_guard_competition_result_immutable
  before update on public.competition_results
  for each row execute function public.guard_competition_result_immutable();

create or replace function public.enforce_competition_result_team_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  team_comp uuid;
begin
  select competition_id into team_comp from public.competition_teams where id = new.team_id;
  if team_comp is null or team_comp is distinct from new.competition_id then
    raise exception 'RESULT_TEAM_COMPETITION_MISMATCH' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_competition_result_team_match on public.competition_results;
create trigger trg_competition_result_team_match
  before insert or update of competition_id, team_id
  on public.competition_results
  for each row execute function public.enforce_competition_result_team_match();

-- Drop any prior self-select WITH CHECK policies and install non-recursive ones.
drop policy if exists "Captain or organizer update team" on public.competition_teams;
create policy "Captain or organizer update team"
  on public.competition_teams for update to authenticated
  using (
    captain_id = (select auth.uid())
    or exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.organizer_id = (select auth.uid())
    )
  )
  with check (
    (
      captain_id = (select auth.uid())
      and status in ('registered', 'withdrawn')
    )
    or exists (
      select 1 from public.competitions c
      where c.id = competition_id
        and c.organizer_id = (select auth.uid())
        and status in ('registered', 'withdrawn', 'disqualified')
    )
  );

drop policy if exists "Organizer moderates results" on public.competition_results;
create policy "Organizer moderates results"
  on public.competition_results for update to authenticated
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.organizer_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.organizer_id = (select auth.uid())
    )
    and status in ('pending', 'submitted', 'accepted', 'rejected')
  );
