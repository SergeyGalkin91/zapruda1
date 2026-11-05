-- STAGING only. Requires the applied zone membership delta. No seed data or new chat engine.
do $$
begin
 if exists(select 1 from pg_class c where c.oid in ('public.chat_messages'::regclass,
   'public.social_threads'::regclass,'public.social_messages'::regclass,
   'public.fishing_reports'::regclass,'public.report_photos'::regclass) and not c.relrowsecurity)
 then raise exception 'ON SPOT dependencies must have RLS enabled'; end if;
end$$;
create table zc_osp_internal.preferences (
  zone_id uuid not null, user_id uuid not null,
  allow_invites boolean not null default false,
  announcements_since timestamptz,
  primary key(zone_id,user_id),
  foreign key(zone_id,user_id) references zc_osp_internal.memberships on delete cascade
);
create table zc_osp_internal.presences (
  zone_id uuid not null, user_id uuid not null,
  session_id uuid not null references auth.sessions(id) on delete cascade,
  expires_at timestamptz not null, discoverable boolean not null default false,
  primary key(zone_id,user_id),
  foreign key(zone_id,user_id) references zc_osp_internal.memberships on delete cascade
);
create index osp_presence_expiry on zc_osp_internal.presences(expires_at);
create index osp_presence_session on zc_osp_internal.presences(session_id);
create table zc_osp_internal.closed_presence_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade
);
create table zc_osp_internal.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  peer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,peer_id), check(blocker_id<>peer_id)
);
create index osp_block_reverse on zc_osp_internal.blocks(peer_id,blocker_id);
create table zc_osp_internal.invitations (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zc_osp_internal.zones on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours',
  thread_id uuid references public.social_threads(id) on delete set null,
  meetup_id uuid references public.meetup_posts(id) on delete set null,
  report_id uuid references public.fishing_reports(id) on delete set null,
  check(sender_id<>recipient_id)
);
create index osp_invite_sender on zc_osp_internal.invitations(sender_id,zone_id,created_at desc);
create index osp_invite_recipient on zc_osp_internal.invitations(recipient_id,zone_id,created_at desc);
create index osp_invite_retention on zc_osp_internal.invitations(updated_at);
create table zc_osp_internal.announcements (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zc_osp_internal.zones on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default now()+interval '2 hours',
  withdrawn_at timestamptz
);
create index osp_announcement_zone on zc_osp_internal.announcements(zone_id,expires_at);
create index osp_announcement_sender on zc_osp_internal.announcements(sender_id);
create index osp_announcement_expiry on zc_osp_internal.announcements(expires_at);
create table zc_osp_internal.deliveries (
  announcement_id uuid not null references zc_osp_internal.announcements on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dismissed_at timestamptz,
  primary key(announcement_id,user_id)
);
create index osp_deliveries_user on zc_osp_internal.deliveries(user_id,announcement_id);
-- The barrier survives revoked/expired consent and user deletion until the photo itself is deleted.
create table zc_osp_internal.photo_shares (
  photo_id uuid primary key references public.report_photos(id) on delete cascade,
  zone_id uuid not null references zc_osp_internal.zones on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  expected_consents smallint not null check(expected_consents between 2 and 6),
  created_at timestamptz not null default now()
);
create index osp_photo_zone on zc_osp_internal.photo_shares(zone_id);
create index osp_photo_owner on zc_osp_internal.photo_shares(owner_id);
create table zc_osp_internal.photo_consents (
  photo_id uuid not null references zc_osp_internal.photo_shares on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','declined','revoked')),
  review_session uuid references auth.sessions(id) on delete set null,
  review_until timestamptz,
  changed_at timestamptz not null default now(),
  primary key(photo_id,user_id)
);
create index osp_photo_consent_actor on zc_osp_internal.photo_consents(user_id,photo_id);
create index osp_photo_review_session on zc_osp_internal.photo_consents(review_session) where review_session is not null;
create table zc_osp_internal.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zc_osp_internal.zones on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  subject_kind text not null check(subject_kind in ('message','announcement','invite','photo')),
  subject_id uuid not null,
  reason text not null check(reason in ('spam','abuse','privacy','unsafe')),
  created_at timestamptz not null default now(),
  unique(reporter_id,subject_kind,subject_id)
);
create index osp_abuse_zone_time on zc_osp_internal.abuse_reports(zone_id,created_at);
create table zc_osp_internal.events (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, happened_at timestamptz not null default clock_timestamp()
);
create index osp_event_actor_action on zc_osp_internal.events(user_id,action,happened_at);
create index osp_event_time on zc_osp_internal.events(happened_at);
alter table zc_osp_internal.preferences enable row level security;
alter table zc_osp_internal.presences enable row level security;
alter table zc_osp_internal.closed_presence_sessions enable row level security;
alter table zc_osp_internal.blocks enable row level security;
alter table zc_osp_internal.invitations enable row level security;
alter table zc_osp_internal.announcements enable row level security;
alter table zc_osp_internal.deliveries enable row level security;
alter table zc_osp_internal.photo_shares enable row level security;
alter table zc_osp_internal.photo_consents enable row level security;
alter table zc_osp_internal.abuse_reports enable row level security;
alter table zc_osp_internal.events enable row level security;
revoke all on all tables in schema zc_osp_internal from public,anon,authenticated;
grant all on all tables in schema zc_osp_internal to service_role;

create function zc_osp_internal.live_session(p_actor uuid) returns uuid
language sql stable set search_path=pg_catalog as $$
 select s.id from auth.sessions s where s.user_id=p_actor
  and s.id=nullif(auth.jwt()->>'session_id','')::uuid
  and (s.not_after is null or s.not_after>now())
  and not exists(select 1 from zc_osp_internal.closed_presence_sessions c where c.session_id=s.id)
$$;

create function zc_osp_internal.active_member(p_zone uuid,p_actor uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
 select has_function_privilege('authenticated','public.zc_osp_catalog()','EXECUTE') and exists(select 1 from zc_osp_internal.zones z
 join public.zc_public_spots s on s.id=z.source_spot_id
 join public.chat_places p on p.id=z.chat_place_id and p.level='spot-zone' and p.country_code=z.country_code
 join zc_osp_internal.memberships m on m.zone_id=z.id and m.user_id=p_actor
 join auth.users u on u.id=m.user_id and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 where z.id=p_zone and z.approved and s.state='approved' and s.reviewed_at is not null
 and not exists(select 1 from zc_osp_internal.bans b where b.zone_id=z.id and b.user_id=p_actor))
$$;

create function zc_osp_internal.pair_blocked(a uuid,b uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
 select exists(select 1 from zc_osp_internal.blocks k
 where (k.blocker_id=a and k.peer_id=b) or (k.blocker_id=b and k.peer_id=a))
$$;
-- Zone chat permissions also cease when the Auth session is revoked; ordinary chat is unchanged.
create or replace function zc_osp_internal.can_access_place(p_place uuid,p_zone_only boolean)
returns boolean language plpgsql stable security definer set search_path=pg_catalog as $$
declare kind text; zid uuid; actor uuid:=auth.uid();
begin
 select p.level into kind from public.chat_places p where p.id=p_place;
 if kind is null then return false; end if;
 select z.id into zid from zc_osp_internal.zones z where z.chat_place_id=p_place;
 if kind<>'spot-zone' and zid is null then return not p_zone_only; end if;
 return kind='spot-zone' and zc_osp_internal.live_session(actor) is not null
    and zc_osp_internal.active_member(zid,actor);
end$$;
create function zc_osp_internal.dm_pair_visible(a uuid,b uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select (auth.uid()=a or auth.uid()=b) and not zc_osp_internal.pair_blocked(a,b)
$$;
create policy osp_dm_block_boundary on public.social_threads as restrictive for all to authenticated
 using(zc_osp_internal.dm_pair_visible(requester_id,recipient_id))
 with check(zc_osp_internal.dm_pair_visible(requester_id,recipient_id));
-- Existing social_messages policies require a visible accepted social_thread.
create function zc_osp_internal.zone_message_visible(p_place uuid,p_sender uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select not exists(select 1 from zc_osp_internal.zones where chat_place_id=p_place)
  or not zc_osp_internal.pair_blocked(auth.uid(),p_sender)
$$;
create policy osp_message_pair_block on public.chat_messages as restrictive for select to authenticated
 using(zc_osp_internal.zone_message_visible(place_id,user_id));
-- Existing reaction/photo access continues to require a visible parent message.

create function zc_osp_internal.note_action(p_actor uuid,p_action text,p_limit int,p_window interval)
returns void language plpgsql set search_path=pg_catalog as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('osp-membership:'||p_actor::text,0));
 if (select count(*) from zc_osp_internal.events e where e.user_id=p_actor and e.action=p_action
     and e.happened_at>clock_timestamp()-p_window)>=p_limit
 then raise exception 'ON SPOT action rate limit' using errcode='54000'; end if;
 insert into zc_osp_internal.events(user_id,action) values(p_actor,p_action);
end$$;
create function zc_osp_internal.prune_expired() returns void
language plpgsql set search_path=pg_catalog as $$
begin
 delete from zc_osp_internal.presences p where (p.zone_id,p.user_id) in
   (select q.zone_id,q.user_id from zc_osp_internal.presences q where q.expires_at<=now() order by q.expires_at limit 500 for update skip locked);
 delete from zc_osp_internal.announcements a where a.id in
   (select q.id from zc_osp_internal.announcements q where q.expires_at<now()-interval '7 days' order by q.expires_at limit 500 for update skip locked);
 delete from zc_osp_internal.invitations i where i.id in
   (select q.id from zc_osp_internal.invitations q where q.updated_at<now()-interval '30 days' order by q.updated_at limit 500 for update skip locked);
 delete from zc_osp_internal.events e where e.ctid in
   (select q.ctid from zc_osp_internal.events q where q.happened_at<now()-interval '30 days' order by q.happened_at limit 500 for update skip locked);
end$$;
create function zc_osp_internal.throttle_zone_message() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid();
begin
 if actor is not null and actor=new.user_id and zc_osp_internal.can_access_place(new.place_id,true) then
  perform zc_osp_internal.note_action(actor,'zone_message',15,interval '1 minute');
 end if;
 return new;
end$$;
create trigger osp_zone_message_rate before insert on public.chat_messages
 for each row execute function zc_osp_internal.throttle_zone_message();

create function zc_osp_internal.available_people(p_zone uuid,p_viewer uuid) returns setof uuid
language sql stable set search_path=pg_catalog as $$
 with eligible as materialized (
  select p.user_id from zc_osp_internal.presences p
  join auth.sessions s on s.id=p.session_id and s.user_id=p.user_id
  where p.zone_id=p_zone and p.discoverable and p.expires_at>now()
   and (s.not_after is null or s.not_after>now())
   and not exists(select 1 from zc_osp_internal.closed_presence_sessions c where c.session_id=s.id)
   and zc_osp_internal.active_member(p_zone,p.user_id)
   and not zc_osp_internal.pair_blocked(p_viewer,p.user_id)
  order by p.user_id limit 100
 )
 select e.user_id from eligible e
 where e.user_id<>p_viewer and (select count(*) from eligible)>=5
  and exists(select 1 from eligible q where q.user_id=p_viewer)
 order by e.user_id limit 10
$$;
create function zc_osp_internal.can_receive_announcement(p_id uuid,p_user uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
 select exists(select 1 from zc_osp_internal.announcements a
 join zc_osp_internal.deliveries d on d.announcement_id=a.id and d.user_id=p_user and d.dismissed_at is null
 join zc_osp_internal.preferences p on p.zone_id=a.zone_id and p.user_id=p_user
 where a.id=p_id and a.withdrawn_at is null and a.expires_at>now()
  and p.announcements_since is not null and p.announcements_since<=a.created_at
  and zc_osp_internal.active_member(a.zone_id,p_user)
  and zc_osp_internal.active_member(a.zone_id,a.sender_id)
  and not zc_osp_internal.pair_blocked(p_user,a.sender_id))
$$;

create function zc_osp_internal.shared_photo_allowed(p_photo uuid,p_actor uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
 select exists(select 1 from zc_osp_internal.photo_shares s
 join zc_osp_internal.photo_consents c on c.photo_id=s.photo_id and c.user_id=p_actor
 join public.report_photos p on p.id=s.photo_id and p.user_id=s.owner_id
 join public.fishing_reports r on r.id=p.report_id and r.user_id=s.owner_id
 where s.photo_id=p_photo and s.owner_id is not null and p.sanitized_path is not null and p.sanitized_at is not null
  and c.status in ('pending','approved') and zc_osp_internal.live_session(p_actor) is not null
  and zc_osp_internal.active_member(s.zone_id,p_actor)
  and zc_osp_internal.active_member(s.zone_id,s.owner_id)
  and not zc_osp_internal.pair_blocked(p_actor,s.owner_id)
  and (select count(*) from zc_osp_internal.photo_consents k where k.photo_id=s.photo_id)=s.expected_consents
  and not exists(select 1 from zc_osp_internal.photo_consents k where k.photo_id=s.photo_id and k.status in ('declined','revoked'))
  and (
   (c.review_until>now() and c.review_session=zc_osp_internal.live_session(p_actor))
   or (c.status='approved' and
     (select count(*) from zc_osp_internal.photo_consents k where k.photo_id=s.photo_id
       and k.status='approved' and zc_osp_internal.active_member(s.zone_id,k.user_id)
       and not zc_osp_internal.pair_blocked(p_actor,k.user_id)
       and not zc_osp_internal.pair_blocked(s.owner_id,k.user_id))=s.expected_consents)
  ))
$$;
create function zc_osp_internal.photo_boundary(p_photo uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select not exists(select 1 from zc_osp_internal.photo_shares s where s.photo_id=p_photo)
  or exists(select 1 from zc_osp_internal.photo_shares s where s.photo_id=p_photo and s.owner_id=auth.uid())
  or zc_osp_internal.shared_photo_allowed(p_photo,auth.uid())
$$;
create function zc_osp_internal.photo_member_read(p_photo uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select zc_osp_internal.shared_photo_allowed(p_photo,auth.uid())
$$;
create policy osp_photo_consent_boundary on public.report_photos as restrictive for select to anon,authenticated
 using(zc_osp_internal.photo_boundary(id));
create policy osp_photo_member_read on public.report_photos for select to authenticated
 using(zc_osp_internal.photo_member_read(id));
-- The existing Edge photo broker calls this for a private report whose parent row is not visible.
create function public.zc_osp_shared_photo_access(p_photo uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select zc_osp_internal.shared_photo_allowed(p_photo,zc_osp_internal.require_actor())
$$;

create function zc_osp_internal.retire_zone_actor(p_zone uuid,p_actor uuid) returns void
language plpgsql set search_path=pg_catalog as $$
begin
 delete from zc_osp_internal.presences where zone_id=p_zone and user_id=p_actor;
 delete from zc_osp_internal.preferences where zone_id=p_zone and user_id=p_actor;
 update zc_osp_internal.invitations set status='cancelled',updated_at=now()
  where zone_id=p_zone and status='pending' and p_actor in (sender_id,recipient_id);
 update zc_osp_internal.announcements set withdrawn_at=now()
  where zone_id=p_zone and sender_id=p_actor and withdrawn_at is null;
 update zc_osp_internal.photo_consents c set status='revoked',review_session=null,review_until=null,changed_at=now()
  from zc_osp_internal.photo_shares s where s.photo_id=c.photo_id and s.zone_id=p_zone and c.user_id=p_actor;
end$$;
create or replace function public.zc_osp_leave(p_zone uuid) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=zc_osp_internal.require_actor();
begin
 perform pg_advisory_xact_lock(hashtextextended('osp-membership:'||actor::text,0));
 perform zc_osp_internal.retire_zone_actor(p_zone,actor);
 delete from zc_osp_internal.memberships where zone_id=p_zone and user_id=actor;
end$$;
create function zc_osp_internal.on_zone_ban() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform zc_osp_internal.retire_zone_actor(new.zone_id,new.user_id);
 return new;
end$$;
create trigger osp_ban_revoke_scopes after insert on zc_osp_internal.bans
 for each row execute function zc_osp_internal.on_zone_ban();
create function zc_osp_internal.retire_closed_zone(p_zone uuid) returns void
language plpgsql set search_path=pg_catalog as $$
begin
 delete from zc_osp_internal.presences where zone_id=p_zone;
 delete from zc_osp_internal.preferences where zone_id=p_zone;
 update zc_osp_internal.invitations set status='cancelled',updated_at=now() where zone_id=p_zone and status='pending';
 update zc_osp_internal.announcements set withdrawn_at=now() where zone_id=p_zone and withdrawn_at is null;
 update zc_osp_internal.photo_consents c set status='revoked',review_session=null,review_until=null,changed_at=now()
  from zc_osp_internal.photo_shares s where s.photo_id=c.photo_id and s.zone_id=p_zone;
end$$;
create function zc_osp_internal.on_zone_close() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform zc_osp_internal.retire_closed_zone(new.id);
 return new;
end$$;
create trigger osp_zone_close_revoke after update of approved,source_spot_id on zc_osp_internal.zones
 for each row when (old.approved and (not new.approved or new.source_spot_id<>old.source_spot_id))
 execute function zc_osp_internal.on_zone_close();
create function zc_osp_internal.on_source_close() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare zid uuid;
begin
 for zid in select id from zc_osp_internal.zones where source_spot_id=new.id loop
  perform zc_osp_internal.retire_closed_zone(zid);
 end loop;
 return new;
end$$;
create trigger osp_source_close_revoke after update of state,reviewed_at on public.zc_public_spots
 for each row when (old.state='approved' and old.reviewed_at is not null and (new.state<>'approved' or new.reviewed_at is null))
 execute function zc_osp_internal.on_source_close();

create function zc_osp_internal.zone_snapshot(p_zone uuid,actor uuid,sid uuid) returns jsonb
language plpgsql set search_path=pg_catalog as $$
declare out_json jsonb; people jsonb:='[]'::jsonb;
begin
 perform zc_osp_internal.prune_expired();
 if exists(select 1 from zc_osp_internal.presences where zone_id=p_zone and user_id=actor and session_id=sid
           and discoverable and expires_at>now()) then
  -- Do not publish last-seen, exact distances, coordinates, counts, or another session's ID.
  begin
   perform zc_osp_internal.note_action(actor,'discovery',16,interval '1 minute');
   select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.display_name,p.username,'Рыболов'))),'[]')
    into people from zc_osp_internal.available_people(p_zone,actor) as ids(id)
    join public.profiles p on p.id=ids.id;
  exception when program_limit_exceeded then people:='[]'::jsonb;
  end;
 end if;
 select jsonb_build_object(
  'presence',(select jsonb_build_object('expires_at',p.expires_at,'discoverable',p.discoverable)
   from zc_osp_internal.presences p where p.zone_id=p_zone and p.user_id=actor and p.session_id=sid and p.expires_at>now()),
  'allow_invites',coalesce((select p.allow_invites from zc_osp_internal.preferences p where p.zone_id=p_zone and p.user_id=actor),false),
  'announcements',exists(select 1 from zc_osp_internal.preferences p where p.zone_id=p_zone and p.user_id=actor and p.announcements_since is not null),
  'people',people,
  'invites',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select i.id, case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end status,
    i.sender_id=actor as outgoing, p.id as peer_id, coalesce(p.display_name,p.username,'Рыболов') as peer_name,
    case when i.status='accepted' and not zc_osp_internal.pair_blocked(i.sender_id,i.recipient_id) then i.thread_id end as thread_id,
    case when i.status='accepted' then i.meetup_id end as meetup_id,
    case when i.sender_id=actor then i.report_id end as report_id
    from zc_osp_internal.invitations i join public.profiles p
     on p.id=case when i.sender_id=actor then i.recipient_id else i.sender_id end
    where i.zone_id=p_zone and actor in (i.sender_id,i.recipient_id)
      and not zc_osp_internal.pair_blocked(i.sender_id,i.recipient_id)
    order by i.updated_at desc limit 40) q),'[]'),
  'inbox',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select a.id,a.body,coalesce(p.display_name,p.username,'Рыболов') as sender_name
    from zc_osp_internal.announcements a join public.profiles p on p.id=a.sender_id
    join zc_osp_internal.deliveries d on d.announcement_id=a.id and d.user_id=actor
    where a.zone_id=p_zone and zc_osp_internal.can_receive_announcement(a.id,actor)
    order by a.created_at desc limit 30) q),'[]'),
  'photos',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select s.photo_id,c.status,s.owner_id=actor as owned,
      coalesce(p.display_name,p.username,'Рыболов') as owner_name,
      s.owner_id=actor or zc_osp_internal.shared_photo_allowed(s.photo_id,actor) as can_view
    from zc_osp_internal.photo_shares s join zc_osp_internal.photo_consents c on c.photo_id=s.photo_id and c.user_id=actor
    join public.profiles p on p.id=s.owner_id
    where s.zone_id=p_zone and not zc_osp_internal.pair_blocked(actor,s.owner_id)
    order by s.created_at desc limit 30) q),'[]'),
  'own_meetups',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select m.id,m.title from public.meetup_posts m where m.owner_id=actor and m.status='open'
    order by m.created_at desc limit 20) q),'[]'),
  'own_reports',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select r.id,r.title from public.fishing_reports r where r.user_id=actor and not r.is_public
    order by r.created_at desc limit 20) q),'[]'),
  'own_photos',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select p.id,r.title from public.report_photos p join public.fishing_reports r on r.id=p.report_id
    where p.user_id=actor and r.user_id=actor and not r.is_public and p.sanitized_at is not null
     and p.sanitized_path is not null and not exists(select 1 from zc_osp_internal.photo_shares s where s.photo_id=p.id)
    order by p.created_at desc limit 20) q),'[]'),
  'blocked',coalesce((select jsonb_agg(to_jsonb(q)) from (
    select p.id,coalesce(p.display_name,p.username,'Рыболов') as name
    from zc_osp_internal.blocks b join public.profiles p on p.id=b.peer_id
    where b.blocker_id=actor order by b.created_at desc limit 50) q),'[]')
 ) into out_json;
 return out_json;
end$$;

create function zc_osp_internal.social_action(p_action text,p_zone uuid,p_payload jsonb) returns jsonb
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
 select z.chat_place_id into room from zc_osp_internal.zones z
 join public.zc_public_spots s on s.id=z.source_spot_id
 where z.id=zid and z.approved and s.state='approved' and s.reviewed_at is not null
 for share of z,s;
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

create function public.zc_osp_social(p_action text,p_zone uuid,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security definer set search_path=pg_catalog as $$
 select zc_osp_internal.social_action(p_action,p_zone,p_payload)
$$;

revoke all on all functions in schema zc_osp_internal from public,anon,authenticated;
grant execute on function zc_osp_internal.can_access_place(uuid,boolean),
 zc_osp_internal.dm_pair_visible(uuid,uuid),zc_osp_internal.zone_message_visible(uuid,uuid),
 zc_osp_internal.photo_member_read(uuid) to authenticated;
grant execute on function zc_osp_internal.photo_boundary(uuid) to anon,authenticated;
grant execute on function zc_osp_internal.prune_expired() to service_role;
revoke all on function public.zc_osp_social(text,uuid,jsonb),public.zc_osp_shared_photo_access(uuid)
 from public,anon,authenticated;
grant execute on function public.zc_osp_social(text,uuid,jsonb),public.zc_osp_shared_photo_access(uuid) to authenticated;
notify pgrst,'reload schema';
