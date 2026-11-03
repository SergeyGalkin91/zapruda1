-- DRAFT ONLY. DO NOT APPLY until social_groups and social_group_members
-- are provisioned with reviewed RLS, grants, owner memberships and payment flow.
-- STAGING only; NOT a production migration.
--
-- Capacity counts pending + accepted memberships (including organizer membership).
-- Serializes attempts on the SAME club via row lock on social_groups.
-- Important: all membership INSERT / relevant UPDATE use this trigger.
-- Owner must have privileged SELECT on memberships so RLS cannot undercount.

create or replace function public.stage_club_capacity_15()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare occupied integer;
begin
  if new.status not in ('pending','accepted') then return new; end if;
  if tg_op = 'UPDATE'
     and old.group_id = new.group_id
     and old.status in ('pending','accepted') then
    return new; -- occupied slot unchanged
  end if;

  -- FOR UPDATE serializes parallel attempts for this club under READ COMMITTED.
  perform 1 from public.social_groups where id = new.group_id for update;
  if not found then raise exception 'CLUB_NOT_FOUND' using errcode = '23503'; end if;

  select count(*) into occupied
  from public.social_group_members m
  where m.group_id = new.group_id and m.status in ('pending','accepted');

  if occupied >= 15 then
    raise exception 'CLUB_MEMBER_LIMIT: максимум 15 участников, включая заявки'
      using errcode = '23514';
  end if;
  return new;
end $$;

revoke all on function public.stage_club_capacity_15() from public, anon, authenticated;

drop trigger if exists trg_stage_club_capacity_15 on public.social_group_members;
create trigger trg_stage_club_capacity_15
before insert or update of status, group_id on public.social_group_members
for each row execute function public.stage_club_capacity_15();

-- BEFORE APPLY: remove/replace existing legacy capacity trigger in a reviewed
-- same-transaction migration; avoid conflicting capacity 20 / capacity 15 triggers.
-- BEFORE APPLY: verify existing data has <=15 counted members per group.
-- BEFORE APPLY: test concurrent transactions and restrictive RLS under 3 JWT roles.
