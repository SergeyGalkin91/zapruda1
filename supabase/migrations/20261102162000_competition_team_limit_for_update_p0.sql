-- Issue #61-A additive P0: serialize team limit + match results team/competition.
-- Safe to re-run. Requires competition_* tables (create via stage6 or full competitions migration).

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
  for each row
  execute function public.enforce_competition_team_limit();

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
  for each row
  execute function public.enforce_competition_result_team_match();

drop policy if exists "Captain or organizer update team" on public.competition_teams;
create policy "Captain or organizer update team"
  on public.competition_teams for update to authenticated
  using (
    captain_id = auth.uid()
    or exists (select 1 from public.competitions c where c.id = competition_id and c.organizer_id = auth.uid())
  )
  with check (
    captain_id = (select t.captain_id from public.competition_teams t where t.id = id)
    and competition_id = (select t.competition_id from public.competition_teams t where t.id = id)
    and (
      (captain_id = auth.uid() and status in ('registered', 'withdrawn'))
      or (
        exists (select 1 from public.competitions c where c.id = competition_id and c.organizer_id = auth.uid())
        and status in ('registered', 'withdrawn', 'disqualified')
      )
    )
  );

drop policy if exists "Organizer moderates results" on public.competition_results;
create policy "Organizer moderates results"
  on public.competition_results for update to authenticated
  using (
    exists (select 1 from public.competitions c where c.id = competition_id and c.organizer_id = auth.uid())
  )
  with check (
    competition_id = (select r.competition_id from public.competition_results r where r.id = id)
    and team_id = (select r.team_id from public.competition_results r where r.id = id)
    and exists (select 1 from public.competitions c where c.id = competition_id and c.organizer_id = auth.uid())
    and status in ('submitted', 'accepted', 'rejected')
  );
