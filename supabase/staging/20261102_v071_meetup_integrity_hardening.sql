-- STAGING only: v0.7.1 meetup ownership and private-GPS integrity hardening.
-- Never apply to production without separate release approval.
create or replace function public.meetup_post_guard()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
     or new.created_at is distinct from old.created_at then
    raise exception 'MEETUP_POST_IMMUTABLE';
  end if;
  if old.status <> 'open' and new.status = 'open' then
    raise exception 'MEETUP_REOPEN_DENIED';
  end if;
  return new;
end $$;
revoke all on function public.meetup_post_guard() from public;
drop trigger if exists meetup_post_guard_trg on public.meetup_posts;
create trigger meetup_post_guard_trg before update on public.meetup_posts
for each row execute function public.meetup_post_guard();

create or replace function public.meetup_private_details_guard()
returns trigger language plpgsql set search_path='' as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.meetup_posts where id=new.post_id;
  if v_owner is null or new.owner_id is distinct from v_owner then
    raise exception 'MEETUP_DETAILS_OWNER_MISMATCH';
  end if;
  if tg_op='UPDATE' and (new.post_id is distinct from old.post_id
       or new.owner_id is distinct from old.owner_id) then
    raise exception 'MEETUP_DETAILS_IMMUTABLE';
  end if;
  return new;
end $$;
revoke all on function public.meetup_private_details_guard() from public;
drop trigger if exists meetup_private_details_guard_trg on public.meetup_private_details;
create trigger meetup_private_details_guard_trg before insert or update on public.meetup_private_details
for each row execute function public.meetup_private_details_guard();
