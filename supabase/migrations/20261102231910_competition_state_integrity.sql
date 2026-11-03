-- STAGING v0.7.1 security correction. Requires the competition baseline + P0 guard.
-- No data rewrites; production application requires the separate release process.

create or replace function public.guard_competition_immutable()
returns trigger language plpgsql security invoker set search_path='' as $$
declare registered_count integer;
begin
  if new.id is distinct from old.id
     or new.organizer_id is distinct from old.organizer_id
     or new.created_at is distinct from old.created_at then
    raise exception 'COMPETITION_SYSTEM_FIELDS_IMMUTABLE' using errcode='42501';
  end if;
  if new.max_teams < old.max_teams then
    select count(*) into registered_count from public.competition_teams
    where competition_id=old.id and status='registered';
    if registered_count > new.max_teams then
      raise exception 'COMPETITION_CAPACITY_BELOW_REGISTERED' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_competition_immutable on public.competitions;
create trigger trg_guard_competition_immutable before update on public.competitions
for each row execute function public.guard_competition_immutable();

create or replace function public.guard_competition_team_immutable()
returns trigger language plpgsql security invoker set search_path='' as $$
declare organizer uuid;
begin
  if new.id is distinct from old.id
     or new.competition_id is distinct from old.competition_id
     or new.captain_id is distinct from old.captain_id
     or new.created_at is distinct from old.created_at then
    raise exception 'COMPETITION_TEAM_SYSTEM_FIELDS_IMMUTABLE' using errcode='42501';
  end if;
  if old.status='disqualified' and new.status is distinct from old.status then
    select organizer_id into organizer from public.competitions where id=old.competition_id;
    if organizer is distinct from (select auth.uid()) then
      raise exception 'COMPETITION_DISQUALIFICATION_ORGANIZER_ONLY' using errcode='42501';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_competition_result_immutable()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.id is distinct from old.id
     or new.competition_id is distinct from old.competition_id
     or new.team_id is distinct from old.team_id
     or new.submitted_by is distinct from old.submitted_by
     or new.created_at is distinct from old.created_at then
    raise exception 'COMPETITION_RESULT_SYSTEM_FIELDS_IMMUTABLE' using errcode='42501';
  end if;
  return new;
end $$;

-- Existing SECURITY DEFINER trigger: count all registered teams while locking
-- the parent row; it remains unavailable for direct client execution.
create or replace function public.enforce_competition_team_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare max_t integer; competition_status text; registered_count integer;
begin
  if new.status is distinct from 'registered' then return new; end if;
  select max_teams,status into max_t,competition_status
  from public.competitions where id=new.competition_id for update;
  if max_t is null then raise exception 'COMPETITION_MISSING' using errcode='23503'; end if;
  if competition_status not in ('open','live') then
    if tg_op='INSERT' then
      raise exception 'COMPETITION_REGISTRATION_CLOSED' using errcode='23514';
    elsif old.status is distinct from 'registered' then
      raise exception 'COMPETITION_REGISTRATION_CLOSED' using errcode='23514';
    end if;
  end if;
  select count(*) into registered_count from public.competition_teams
  where competition_id=new.competition_id and status='registered'
    and (tg_op='INSERT' or id is distinct from new.id);
  if registered_count >= max_t then
    raise exception 'COMPETITION_FULL: набор команд закрыт' using errcode='23514';
  end if;
  return new;
end $$;

drop policy if exists "Captain registers team" on public.competition_teams;
create policy "Captain registers team" on public.competition_teams
for insert to authenticated with check (
  captain_id=(select auth.uid()) and status='registered'
  and exists(select 1 from public.competitions c
    where c.id=competition_teams.competition_id and c.status in ('open','live'))
);

drop policy if exists "Captain or organizer update team" on public.competition_teams;
create policy "Captain or organizer update team" on public.competition_teams
for update to authenticated
using (
  captain_id=(select auth.uid())
  or exists(select 1 from public.competitions c
    where c.id=competition_teams.competition_id and c.organizer_id=(select auth.uid()))
)
with check (
  (captain_id=(select auth.uid()) and status in ('registered','withdrawn'))
  or exists(select 1 from public.competitions c
    where c.id=competition_teams.competition_id and c.organizer_id=(select auth.uid())
    -- Qualify the outer row: an unqualified status here resolves to c.status.
    and competition_teams.status in ('registered','withdrawn','disqualified'))
);

drop policy if exists "Captain submits result" on public.competition_results;
create policy "Captain submits result" on public.competition_results
for insert to authenticated with check (
  submitted_by=(select auth.uid()) and status in ('pending','submitted')
  and exists(select 1 from public.competition_teams t
    where t.id=competition_results.team_id
      and t.competition_id=competition_results.competition_id
      and t.captain_id=(select auth.uid()) and t.status='registered')
  and exists(select 1 from public.competitions c
    where c.id=competition_results.competition_id and c.status in ('open','live'))
);

revoke all on function public.guard_competition_immutable() from public,anon,authenticated;
revoke all on function public.guard_competition_team_immutable() from public,anon,authenticated;
revoke all on function public.guard_competition_result_immutable() from public,anon,authenticated;
revoke all on function public.enforce_competition_team_limit() from public,anon,authenticated;
revoke all on function public.enforce_competition_result_team_match() from public,anon,authenticated;
