-- STAGING review source. Apply only after membership and social privacy deltas.
-- Community zones reuse the existing room, membership, media and consent boundaries.
do $$
begin
  if to_regprocedure('zc_osp_internal.social_action(text,uuid,jsonb)') is null
     or not exists (
       select 1 from pg_trigger
       where tgrelid='zc_osp_internal.zones'::regclass
         and tgname='osp_zone_close_revoke' and tgenabled in ('O','A')
     ) then
    raise exception 'ON SPOT+ social privacy delta is required' using errcode='55000';
  end if;
end$$;

alter table zc_osp_internal.zones
  add column zone_kind text not null default 'record_spot',
  alter column source_spot_id drop not null,
  add constraint osp_zone_origin_check check (
    (zone_kind='record_spot' and source_spot_id is not null)
    or (zone_kind='community' and source_spot_id is null)
  );

create table zc_osp_internal.community_zone_reviews (
  zone_id uuid primary key references zc_osp_internal.zones(id) on delete restrict,
  room_parent_id uuid,
  approval_ref text not null check (approval_ref ~ '^[A-Za-z][A-Za-z0-9_-]{2,63}$'),
  approved_by name not null,
  approved_at timestamptz not null default statement_timestamp(),
  withdrawal_ref text check (withdrawal_ref ~ '^[A-Za-z][A-Za-z0-9_-]{2,63}$'),
  withdrawn_by name,
  withdrawn_at timestamptz,
  check (
    (withdrawal_ref is null and withdrawn_by is null and withdrawn_at is null)
    or (withdrawal_ref is not null and withdrawn_by is not null and withdrawn_at is not null and withdrawn_at >= approved_at)
  )
);
alter table zc_osp_internal.community_zone_reviews enable row level security;
revoke all on table zc_osp_internal.community_zone_reviews from public,anon,authenticated,service_role;

create or replace function zc_osp_internal.validate_zone_room() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_op='UPDATE' then
    if new.zone_kind<>old.zone_kind
       or (old.zone_kind='community' and
           (new.id,new.chat_place_id,new.name,new.area_label,new.country_code)
           is distinct from
           (old.id,old.chat_place_id,old.name,old.area_label,old.country_code)) then
      raise exception 'Zone identity is fixed' using errcode='23514';
    end if;
    -- Operators must be able to close a community zone even if its room has drifted.
    if new.zone_kind='community' and not new.approved then return new; end if;
  end if;
  if not exists (
    select 1 from public.chat_places p
    where p.id=new.chat_place_id and p.level='spot-zone' and p.country_code=new.country_code
      and (new.zone_kind='record_spot' or p.name=new.name)
  ) then
    raise exception 'A dedicated zone chat is required' using errcode='23514';
  end if;
  if new.zone_kind='community' and new.approved and not exists (
    select 1 from zc_osp_internal.community_zone_reviews r
    join public.chat_places p on p.id=new.chat_place_id
    where r.zone_id=new.id and r.withdrawn_at is null
      and r.room_parent_id is not distinct from p.parent_id
  ) then
    raise exception 'Community zone review is required' using errcode='23514';
  end if;
  return new;
end$$;

-- Private, invoker-rights operator entry point. References identify the owner review record.
create function zc_osp_internal.review_community_zone(
  p_zone uuid,p_approved boolean,p_reference text
) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare
  candidate zc_osp_internal.zones%rowtype;
  room_parent uuid;
begin
  if p_approved is null or p_reference is null or p_reference !~ '^[A-Za-z][A-Za-z0-9_-]{2,63}$' then
    raise exception 'A valid review reference is required' using errcode='22023';
  end if;
  select z.* into candidate from zc_osp_internal.zones z
  where z.id=p_zone and z.zone_kind='community'
  for update;
  if not found then
    raise exception 'Community zone unavailable' using errcode='42501';
  end if;

  if p_approved then
    select p.parent_id into room_parent from public.chat_places p
    where p.id=candidate.chat_place_id and p.level='spot-zone'
      and p.country_code=candidate.country_code and p.name=candidate.name
    for share;
    if not found then
      raise exception 'A dedicated zone chat is required' using errcode='23514';
    end if;
    insert into zc_osp_internal.community_zone_reviews(zone_id,room_parent_id,approval_ref,approved_by)
    values(p_zone,room_parent,p_reference,current_user) on conflict(zone_id) do nothing;
    if not exists (
      select 1 from zc_osp_internal.community_zone_reviews r
      where r.zone_id=p_zone and r.approval_ref=p_reference and r.withdrawn_at is null
        and r.room_parent_id is not distinct from room_parent
    ) then
      raise exception 'Zone review conflicts with an existing decision' using errcode='55000';
    end if;
    update zc_osp_internal.zones set approved=true where id=p_zone and not approved;
  else
    update zc_osp_internal.community_zone_reviews
    set withdrawn_at=statement_timestamp(),withdrawn_by=current_user,withdrawal_ref=p_reference
    where zone_id=p_zone and withdrawn_at is null;
    if not found and not exists (
      select 1 from zc_osp_internal.community_zone_reviews r
      where r.zone_id=p_zone and r.withdrawn_at is not null and r.withdrawal_ref=p_reference
    ) then
      raise exception 'Zone review conflicts with an existing decision' using errcode='55000';
    end if;
    -- The existing closure trigger retires presence, invitations, inbox delivery and photo grants.
    update zc_osp_internal.zones set approved=false where id=p_zone and approved;
  end if;
end$$;

create function zc_osp_internal.zone_is_open(p_zone uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
  select exists (
    select 1 from zc_osp_internal.zones z
    join public.chat_places p
      on p.id=z.chat_place_id and p.level='spot-zone' and p.country_code=z.country_code
    where z.id=p_zone and z.approved
      and (
        (z.zone_kind='record_spot' and exists (
          select 1 from public.zc_public_spots s
          where s.id=z.source_spot_id and s.state='approved' and s.reviewed_at is not null
        ))
        or (z.zone_kind='community' and p.name=z.name and exists (
          select 1 from zc_osp_internal.community_zone_reviews r
          where r.zone_id=z.id and r.withdrawn_at is null
            and r.room_parent_id is not distinct from p.parent_id
        ))
      )
  )
$$;

-- Write paths hold the room and zone against changes, and the source row for a record zone.
create function zc_osp_internal.lock_open_zone(p_zone uuid) returns uuid
language plpgsql set search_path=pg_catalog as $$
declare
  candidate zc_osp_internal.zones%rowtype;
begin
  select z.* into candidate from zc_osp_internal.zones z
  join public.chat_places p on p.id=z.chat_place_id
  where z.id=p_zone and z.approved
  for share of z,p;
  if not found then return null; end if;
  if candidate.zone_kind='record_spot' then
    perform 1 from public.zc_public_spots s where s.id=candidate.source_spot_id for share;
    if not found then return null; end if;
  end if;
  if zc_osp_internal.zone_is_open(p_zone) then return candidate.chat_place_id; end if;
  return null;
end$$;

create or replace function zc_osp_internal.active_member(p_zone uuid,p_actor uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
  select has_function_privilege('authenticated','public.zc_osp_catalog()','EXECUTE')
    and zc_osp_internal.zone_is_open(p_zone)
    and exists (
      select 1 from zc_osp_internal.memberships m
      join auth.users u on u.id=m.user_id
      where m.zone_id=p_zone and m.user_id=p_actor
        and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
        and not exists (
          select 1 from zc_osp_internal.bans b where b.zone_id=p_zone and b.user_id=p_actor
        )
    )
$$;

create or replace function public.zc_osp_catalog() returns table(
  zone_id uuid,chat_place_id uuid,name text,area_label text,country_code text,is_member boolean
)
language plpgsql stable security definer set search_path=pg_catalog as $$
declare
  actor uuid:=zc_osp_internal.require_actor();
begin
  if zc_osp_internal.live_session(actor) is null then
    raise exception 'Active session required' using errcode='42501';
  end if;
  return query
  select z.id,z.chat_place_id,z.name,z.area_label,z.country_code,m.user_id is not null
  from zc_osp_internal.zones z
  left join zc_osp_internal.memberships m on m.zone_id=z.id and m.user_id=actor
  where zc_osp_internal.zone_is_open(z.id)
    and not exists (
      select 1 from zc_osp_internal.bans b where b.zone_id=z.id and b.user_id=actor
    )
  order by z.name,z.id limit 100;
end$$;

create or replace function public.zc_osp_join(p_zone uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare
  actor uuid:=zc_osp_internal.require_actor();
  room uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('osp-membership:'||actor::text,0));
  if zc_osp_internal.live_session(actor) is null then
    raise exception 'Active session required' using errcode='42501';
  end if;
  room:=zc_osp_internal.lock_open_zone(p_zone);
  if room is null or exists (
    select 1 from zc_osp_internal.bans b where b.zone_id=p_zone and b.user_id=actor
  ) then
    raise exception 'Zone unavailable' using errcode='42501';
  end if;
  if exists (
    select 1 from zc_osp_internal.memberships m where m.zone_id=p_zone and m.user_id=actor
  ) then return room; end if;
  if (select count(*) from zc_osp_internal.memberships m where m.user_id=actor)>=10 then
    raise exception 'Active zone membership limit reached' using errcode='22023';
  end if;
  insert into zc_osp_internal.memberships(zone_id,user_id) values(p_zone,actor);
  return room;
end$$;

-- Rebind existing social actions to the same serialized zone gate.
create or replace function zc_osp_internal.social_action(p_action text,p_zone uuid,p_payload jsonb) returns jsonb
language plpgsql set search_path=pg_catalog as $$
declare
 actor uuid:=zc_osp_internal.require_actor(); zid uuid:=p_zone; sid uuid; peer uuid; object_id uuid; th uuid;
 room uuid; duration int; text_body text; selection text; linked_meetup uuid; linked_report uuid;
 invite zc_osp_internal.invitations%rowtype; selected_peers uuid[]; output_id uuid;
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192
 then raise exception 'Invalid ON SPOT request' using errcode='22023'; end if;
 sid:=zc_osp_internal.live_session(actor);
 if sid is null then
  if p_action='clear_session' then return jsonb_build_object('ok',true); end if;
  raise exception 'Active session required' using errcode='42501';
 end if;

 if zid is null and p_action in ('invite','block','report') then
  select z.id into zid from zc_osp_internal.zones z where z.chat_place_id=(p_payload->>'place')::uuid;
 end if;

 perform pg_advisory_xact_lock(hashtextextended('osp-membership:'||actor::text,0));
 if p_action='snapshot' then
  if zc_osp_internal.live_session(actor) is distinct from sid
   then raise exception 'Active session required' using errcode='42501'; end if;
  if not zc_osp_internal.active_member(zid,actor) then raise exception 'Zone unavailable' using errcode='42501'; end if;
  return zc_osp_internal.zone_snapshot(zid,actor,sid);
 end if;

 if p_action='clear_session' then
  insert into zc_osp_internal.closed_presence_sessions values(sid) on conflict do nothing;
  delete from zc_osp_internal.presences where session_id=sid and user_id=actor;
  update zc_osp_internal.photo_consents set review_session=null,review_until=null where review_session=sid and user_id=actor;
  return jsonb_build_object('ok',true);
 end if;
 if zc_osp_internal.live_session(actor) is distinct from sid
  then raise exception 'Active session required' using errcode='42501'; end if;
 if p_action='presence_off' then
  delete from zc_osp_internal.presences where zone_id=zid and user_id=actor;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='photo_revoke' then
  update zc_osp_internal.photo_consents c set status='revoked',review_session=null,review_until=null,changed_at=now()
   from zc_osp_internal.photo_shares s where c.photo_id=s.photo_id and s.zone_id=zid
    and c.photo_id=(p_payload->>'id')::uuid and c.user_id=actor;
  return jsonb_build_object('ok',true);
 end if;
 -- Serialize consent writes against zone/source closure; no new presence after revocation.
 room:=zc_osp_internal.lock_open_zone(zid);
 if room is null or not zc_osp_internal.active_member(zid,actor)
  then raise exception 'Zone unavailable' using errcode='42501'; end if;
 peer:=nullif(p_payload->>'peer','')::uuid;
 object_id:=nullif(p_payload->>'id','')::uuid;

 case p_action
 when 'presence_on' then
  duration:=(p_payload->>'minutes')::int;
  if duration is null or duration not in (30,60,120) or zc_osp_internal.live_session(actor) is distinct from sid
   then raise exception 'Presence unavailable' using errcode='42501'; end if;
  perform zc_osp_internal.note_action(actor,'presence_on',8,interval '1 hour');
  insert into zc_osp_internal.presences(zone_id,user_id,session_id,expires_at,discoverable)
   values(zid,actor,sid,now()+make_interval(mins=>duration),coalesce((p_payload->>'discoverable')::boolean,false))
   on conflict(zone_id,user_id) do update set session_id=excluded.session_id,expires_at=excluded.expires_at,discoverable=excluded.discoverable;
 when 'preferences' then
  insert into zc_osp_internal.preferences(zone_id,user_id) values(zid,actor) on conflict do nothing;
  update zc_osp_internal.preferences
   set allow_invites=coalesce((p_payload->>'invites')::boolean,allow_invites),
       announcements_since=case when not (p_payload ? 'announcements') then announcements_since
        when (p_payload->>'announcements')::boolean then coalesce(announcements_since,clock_timestamp()) else null end
   where zone_id=zid and user_id=actor;
  perform zc_osp_internal.note_action(actor,'preferences',30,interval '1 hour');
 when 'invite' then
  if peer is null or peer=actor then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('osp-pair:'||least(actor,peer)::text||':'||greatest(actor,peer)::text,0));
  if zc_osp_internal.pair_blocked(actor,peer) or not zc_osp_internal.active_member(zid,peer)
   or not exists(select 1 from zc_osp_internal.preferences where zone_id=zid and user_id=peer and allow_invites)
   or not (exists(select 1 from public.chat_messages m where m.id=object_id and m.place_id=room and m.user_id=peer)
           or exists(select 1 from zc_osp_internal.available_people(zid,actor) p(id) where p.id=peer))
   then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  select i.id into output_id from zc_osp_internal.invitations i where i.zone_id=zid
   and i.status='pending' and i.expires_at>now()
   and ((i.sender_id=actor and i.recipient_id=peer) or (i.sender_id=peer and i.recipient_id=actor))
   order by i.created_at desc limit 1;
  if output_id is not null then return jsonb_build_object('ok',true,'id',output_id); end if;
  perform zc_osp_internal.note_action(actor,'invite',10,interval '24 hours');
  if exists(select 1 from zc_osp_internal.invitations i where i.sender_id=actor and i.recipient_id=peer
     and i.created_at>now()-interval '15 minutes')
   then raise exception 'Invitation cooldown' using errcode='54000'; end if;
  insert into zc_osp_internal.invitations(zone_id,sender_id,recipient_id)
   values(zid,actor,peer) returning id into output_id;
 when 'invite_reply','invite_cancel','link_trip' then
  -- Find only the caller's invitation; pair lock serializes response vs. blocking.
  select * into invite from zc_osp_internal.invitations i where i.id=object_id and i.zone_id=zid
   and actor in (i.sender_id,i.recipient_id);
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  peer:=case when invite.sender_id=actor then invite.recipient_id else invite.sender_id end;
  perform pg_advisory_xact_lock(hashtextextended('osp-pair:'||least(actor,peer)::text||':'||greatest(actor,peer)::text,0));
  select * into strict invite from zc_osp_internal.invitations where id=object_id for update;
  if zc_osp_internal.pair_blocked(actor,peer) then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  if p_action='invite_cancel' and invite.sender_id=actor then
   update zc_osp_internal.invitations set status='cancelled',updated_at=now()
    where id=invite.id and status in ('pending','accepted');
  elsif p_action='invite_reply' and invite.recipient_id=actor then
   selection:=p_payload->>'decision';
   if selection is null or selection not in ('accepted','declined') then raise exception 'Invalid reply' using errcode='22023'; end if;
   if invite.status=selection then return jsonb_build_object('ok',true,'id',invite.id); end if;
   if invite.status<>'pending' or invite.expires_at<=now() or not zc_osp_internal.active_member(zid,peer)
     then raise exception 'Invitation unavailable' using errcode='42501'; end if;
   if selection='accepted' then
    -- The sender requested and this recipient explicitly accepted. Reuse their existing text-only DM.
    select t.id into th from public.social_threads t where t.status='accepted'
     and ((t.requester_id=peer and t.recipient_id=actor) or (t.requester_id=actor and t.recipient_id=peer))
     order by t.created_at limit 1;
    if th is null then
     insert into public.social_threads(requester_id,recipient_id,status) values(peer,actor,'accepted')
      on conflict(requester_id,recipient_id) do update set status='accepted',updated_at=now() returning id into th;
    end if;
   end if;
   update zc_osp_internal.invitations set status=selection,thread_id=th,updated_at=now() where id=invite.id;
  elsif p_action='link_trip' and invite.sender_id=actor and invite.status='accepted' then
   linked_meetup:=nullif(p_payload->>'meetup','')::uuid;
   linked_report:=nullif(p_payload->>'report','')::uuid;
   if (linked_meetup is null and linked_report is null)
     or (linked_meetup is not null and not exists(select 1 from public.meetup_posts m
           where m.id=linked_meetup and m.owner_id=actor and m.status='open'))
     or (linked_report is not null and not exists(select 1 from public.fishing_reports r
           where r.id=linked_report and r.user_id=actor and not r.is_public))
    then raise exception 'Trip source unavailable' using errcode='42501'; end if;
   update zc_osp_internal.invitations set meetup_id=linked_meetup,report_id=linked_report,updated_at=now() where id=invite.id;
  else raise exception 'Invitation action unavailable' using errcode='42501';
  end if;
 when 'block','unblock' then
  if peer is null or peer=actor then raise exception 'Invalid account' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('osp-pair:'||least(actor,peer)::text||':'||greatest(actor,peer)::text,0));
  if p_action='unblock' then
   delete from zc_osp_internal.blocks where blocker_id=actor and peer_id=peer;
  else
   perform zc_osp_internal.note_action(actor,'block',30,interval '1 hour');
   insert into zc_osp_internal.blocks(blocker_id,peer_id) values(actor,peer) on conflict do nothing;
   update zc_osp_internal.invitations i set status='cancelled',updated_at=now()
    where status in ('pending','accepted') and ((i.sender_id=actor and i.recipient_id=peer) or (i.sender_id=peer and i.recipient_id=actor));
   update zc_osp_internal.deliveries d set dismissed_at=now() from zc_osp_internal.announcements a
    where a.id=d.announcement_id and ((a.sender_id=actor and d.user_id=peer) or (a.sender_id=peer and d.user_id=actor));
   update zc_osp_internal.photo_consents c set status='revoked',review_session=null,review_until=null,changed_at=now()
    from zc_osp_internal.photo_shares s where s.photo_id=c.photo_id
     and ((s.owner_id=actor and c.user_id=peer) or (s.owner_id=peer and c.user_id=actor));
  end if;
 when 'announce' then
  text_body:=btrim(p_payload->>'body');
  if text_body is null or char_length(text_body) not between 1 and 280 or text_body ~ '[[:cntrl:]]'
   then raise exception 'Invalid announcement' using errcode='22023'; end if;
  perform zc_osp_internal.note_action(actor,'announce_burst',1,interval '15 minutes');
  perform zc_osp_internal.note_action(actor,'announce',3,interval '24 hours');
  insert into zc_osp_internal.announcements(zone_id,sender_id,body) values(zid,actor,text_body) returning id into output_id;
  insert into zc_osp_internal.deliveries(announcement_id,user_id)
   select output_id,p.user_id from zc_osp_internal.preferences p
   where p.zone_id=zid and p.user_id<>actor and p.announcements_since is not null
    and zc_osp_internal.active_member(zid,p.user_id) and not zc_osp_internal.pair_blocked(actor,p.user_id)
   order by p.user_id limit 1000;
 when 'dismiss' then
  update zc_osp_internal.deliveries d set dismissed_at=now() from zc_osp_internal.announcements a
   where a.id=d.announcement_id and a.zone_id=zid and a.id=object_id and d.user_id=actor;
 when 'photo_request' then
  if coalesce((p_payload->>'consent')::boolean,false)=false or jsonb_typeof(p_payload->'peers') is distinct from 'array'
    then raise exception 'Explicit photo consent required' using errcode='42501'; end if;
  select array_agg(distinct x::uuid order by x::uuid) into selected_peers from jsonb_array_elements_text(p_payload->'peers') x;
  if coalesce(cardinality(selected_peers),0) not between 1 and 5 or actor=any(selected_peers)
    then raise exception 'Invalid participants' using errcode='22023'; end if;
  foreach peer in array selected_peers loop
   perform pg_advisory_xact_lock(hashtextextended('osp-pair:'||least(actor,peer)::text||':'||greatest(actor,peer)::text,0));
   if zc_osp_internal.pair_blocked(actor,peer) or not zc_osp_internal.active_member(zid,peer)
    or not exists(select 1 from zc_osp_internal.invitations i where i.zone_id=zid and i.status='accepted'
       and ((i.sender_id=actor and i.recipient_id=peer) or (i.sender_id=peer and i.recipient_id=actor)))
    then raise exception 'Photo participants unavailable' using errcode='42501'; end if;
  end loop;
  -- Lock own private parent so concurrent publish cannot predate the consent barrier.
  perform 1 from public.report_photos p join public.fishing_reports r on r.id=p.report_id
   where p.id=object_id and p.user_id=actor and r.user_id=actor and not r.is_public
    and p.sanitized_path is not null and p.sanitized_at is not null for update of r,p;
  if not found then raise exception 'Private sanitized photo required' using errcode='42501'; end if;
  perform zc_osp_internal.note_action(actor,'photo_request',10,interval '24 hours');
  insert into zc_osp_internal.photo_shares(photo_id,zone_id,owner_id,expected_consents)
   values(object_id,zid,actor,cardinality(selected_peers)+1);
  insert into zc_osp_internal.photo_consents(photo_id,user_id,status) values(object_id,actor,'approved');
  insert into zc_osp_internal.photo_consents(photo_id,user_id) select object_id,unnest(selected_peers);
 when 'photo_preview','photo_reply' then
  select s.owner_id into peer from zc_osp_internal.photo_shares s
   join zc_osp_internal.photo_consents c on c.photo_id=s.photo_id and c.user_id=actor
   where s.photo_id=object_id and s.zone_id=zid and s.owner_id<>actor;
  if peer is null or zc_osp_internal.pair_blocked(actor,peer) or not zc_osp_internal.active_member(zid,peer)
    then raise exception 'Photo request unavailable' using errcode='42501'; end if;
  if p_action='photo_preview' then
   update zc_osp_internal.photo_consents set review_session=sid,review_until=now()+interval '10 minutes',changed_at=now()
    where photo_id=object_id and user_id=actor and status='pending';
  else
   selection:=p_payload->>'decision';
   if selection='approved' then
    update zc_osp_internal.photo_consents set status='approved',review_session=null,review_until=null,changed_at=now()
     where photo_id=object_id and user_id=actor and status='pending' and review_session=sid and review_until>now();
   elsif selection='declined' then
    update zc_osp_internal.photo_consents set status='declined',review_session=null,review_until=null,changed_at=now()
     where photo_id=object_id and user_id=actor and status='pending';
   else raise exception 'Invalid photo decision' using errcode='22023';
   end if;
  end if;
  if not found then raise exception 'Photo request changed' using errcode='42501'; end if;
 when 'report' then
  selection:=p_payload->>'kind';
  if not coalesce(
    (selection='message' and exists(select 1 from public.chat_messages m where m.id=object_id and m.place_id=room
       and not zc_osp_internal.pair_blocked(actor,m.user_id)))
    or (selection='announcement' and zc_osp_internal.can_receive_announcement(object_id,actor))
    or (selection='invite' and exists(select 1 from zc_osp_internal.invitations i where i.id=object_id and i.zone_id=zid
       and actor in (i.sender_id,i.recipient_id)))
    or (selection='photo' and exists(select 1 from zc_osp_internal.photo_shares s join zc_osp_internal.photo_consents c
       on s.photo_id=c.photo_id where s.photo_id=object_id and s.zone_id=zid and c.user_id=actor)),false)
   then raise exception 'Report subject unavailable' using errcode='42501'; end if;
  perform zc_osp_internal.note_action(actor,'report',5,interval '1 hour');
  insert into zc_osp_internal.abuse_reports(zone_id,reporter_id,subject_kind,subject_id,reason)
   values(zid,actor,selection,object_id,p_payload->>'reason') on conflict do nothing;
 else raise exception 'Unknown ON SPOT action' using errcode='22023';
 end case;
 return jsonb_build_object('ok',true,'id',output_id);
end$$;

revoke all on function zc_osp_internal.review_community_zone(uuid,boolean,text),
  zc_osp_internal.zone_is_open(uuid),zc_osp_internal.lock_open_zone(uuid)
  from public,anon,authenticated,service_role;
