-- Stage 3: hard limit of 15 participants per social club/group (pending + accepted).
-- Apply on STAGING first. Do not run on production without owner approval.

create or replace function public.enforce_social_group_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  occupied integer;
  max_slots constant integer := 15;
begin
  if new.status is null or new.status not in ('pending', 'accepted') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select count(*)::integer into occupied
    from public.social_group_members m
    where m.group_id = new.group_id
      and m.status in ('pending', 'accepted')
      and not (m.group_id = old.group_id and m.user_id = old.user_id);
  else
    select count(*)::integer into occupied
    from public.social_group_members m
    where m.group_id = new.group_id
      and m.status in ('pending', 'accepted');
  end if;

  if occupied >= max_slots then
    raise exception 'CLUB_MEMBER_LIMIT: в клубе максимум % участников', max_slots
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_social_group_member_limit on public.social_group_members;
create trigger trg_social_group_member_limit
  before insert or update of status, group_id
  on public.social_group_members
  for each row
  execute function public.enforce_social_group_member_limit();

comment on function public.enforce_social_group_member_limit() is
  'ZAPRUDA stage3: max 15 pending+accepted members per social group';
