-- STAGING-only additive replacement. No rows, identities or grants are changed.
-- Existing three-seat admission remains serialized on the parent row.
create or replace function public.meetup_member_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_status text; v_count integer; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'MEETUP_AUTH_REQUIRED'; end if;
  select p.owner_id,p.status into v_owner,v_status
  from public.meetup_posts p where p.id=new.post_id for update;
  if v_owner is null then raise exception 'MEETUP_NOT_FOUND'; end if;
  if tg_op='UPDATE' then
    if new.post_id is distinct from old.post_id or new.user_id is distinct from old.user_id
       or new.role is distinct from old.role or new.created_at is distinct from old.created_at then
      raise exception 'MEETUP_IMMUTABLE_MEMBER';
    end if;
    if new.status is not distinct from old.status then return new; end if;
    if old.role='owner' then raise exception 'MEETUP_OWNER_CANCEL_POST'; end if;
    if new.status='declined' and old.status in ('pending','accepted') then
      if v_actor is distinct from new.user_id and v_actor is distinct from v_owner then
        raise exception 'MEETUP_LEAVE_DENIED';
      end if;
    elsif new.status='accepted' and old.status='pending' then
      if v_actor is distinct from v_owner or v_status<>'open' then
        raise exception 'MEETUP_ACCEPT_OWNER_ONLY';
      end if;
    elsif new.status='pending' and old.status='declined' then
      if v_actor is distinct from new.user_id or v_status<>'open' then
        raise exception 'MEETUP_REJOIN_DENIED';
      end if;
    else raise exception 'MEETUP_TRANSITION_DENIED';
    end if;
  else
    if new.user_id=v_owner then
      if v_actor is distinct from v_owner or new.role<>'owner' or new.status<>'accepted' then
        raise exception 'MEETUP_OWNER_BOOTSTRAP';
      end if;
    elsif new.role<>'participant' or new.status<>'pending'
       or new.user_id is distinct from v_actor or v_status<>'open' then
      raise exception 'MEETUP_JOIN_DENIED';
    end if;
  end if;
  if new.status='accepted' and (tg_op='INSERT' or old.status is distinct from 'accepted') then
    select count(*) into v_count from public.meetup_members m
    where m.post_id=new.post_id and m.status='accepted';
    if v_count>=3 then raise exception 'MEETUP_FULL'; end if;
  end if;
  return new;
end $$;

-- Cancellation revokes both private details and chat without rewriting history.
-- Closed meetings retain access for their accepted participants; no new admission.
create or replace function public.meetup_is_accepted(p_post uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.meetup_members m
    join public.meetup_posts p on p.id=m.post_id
    where m.post_id=p_post and m.user_id=auth.uid()
      and m.status='accepted' and p.status<>'cancelled'
  )
$$;

create or replace function public.meetup_occupancy(p_post uuid)
returns integer language sql stable security definer set search_path='' as $$
  select count(*)::integer from public.meetup_members m
  join public.meetup_posts p on p.id=m.post_id
  where m.post_id=p_post and m.status='accepted' and p.status<>'cancelled'
$$;
-- CREATE OR REPLACE preserves previously hardened function ACLs.
