-- STAGING ONLY: generated with Supabase CLI; never place under automatic Production migrations.
-- Prerequisites were compared with live STAGING. No zones, SPOT, users or moderators are seeded.
create schema zc_osp_internal;
revoke all on schema zc_osp_internal from public,anon,authenticated;
grant usage on schema zc_osp_internal to service_role;

alter table public.chat_places drop constraint chat_places_level_check;
alter table public.chat_places add constraint chat_places_level_check
 check(level in ('global','country','region','city','spot-zone'));

create table zc_osp_internal.zones(
 id uuid primary key default gen_random_uuid(),
 chat_place_id uuid not null unique references public.chat_places(id) on delete restrict,
 source_spot_id uuid not null references public.zc_public_spots(id) on delete restrict,
 name text not null check(char_length(btrim(name)) between 2 and 80 and name !~ '[[:cntrl:]<>]'),
 area_label text not null check(char_length(btrim(area_label)) between 2 and 140 and area_label !~ '[[:cntrl:]<>]'),
 country_code text not null check(country_code in ('RU','BY','KZ','AM','AZ','KG','MD','TJ','UZ','TM')),
 approved boolean not null default false,
 created_at timestamptz not null default now()
);
create index osp_zone_source_spot on zc_osp_internal.zones(source_spot_id);
create table zc_osp_internal.memberships(
 zone_id uuid not null references zc_osp_internal.zones(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(zone_id,user_id)
);
create index osp_membership_actor on zc_osp_internal.memberships(user_id,zone_id);
create table zc_osp_internal.bans(
 zone_id uuid not null references zc_osp_internal.zones(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(zone_id,user_id)
);
create index osp_ban_actor on zc_osp_internal.bans(user_id,zone_id);
alter table zc_osp_internal.zones enable row level security;
alter table zc_osp_internal.memberships enable row level security;
alter table zc_osp_internal.bans enable row level security;
revoke all on all tables in schema zc_osp_internal from public,anon,authenticated;
grant all on all tables in schema zc_osp_internal to service_role;

create function zc_osp_internal.require_actor() returns uuid
language plpgsql stable security definer set search_path=pg_catalog,auth as $$
declare actor uuid := auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users u where u.id=actor
  and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false)
 then raise exception 'Confirmed account required' using errcode='42501'; end if;
 return actor;
end$$;

create function zc_osp_internal.validate_zone_room() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$begin
 if not exists(select 1 from public.chat_places p where p.id=new.chat_place_id
   and p.level='spot-zone' and p.country_code=new.country_code)
 then raise exception 'A dedicated zone chat is required' using errcode='23514'; end if;
 return new;
end$$;
create trigger osp_validate_zone_room before insert or update on zc_osp_internal.zones
 for each row execute function zc_osp_internal.validate_zone_room();

-- Private boolean only: closed and orphaned zone rooms remain protected, even when no registry row is visible.
create function zc_osp_internal.can_access_place(p_place uuid,p_zone_only boolean)
returns boolean language plpgsql stable security definer
set search_path=pg_catalog,public,auth,zc_osp_internal as $$
declare kind text; actor uuid := auth.uid(); is_zone boolean;
begin
 select p.level into kind from public.chat_places p where p.id=p_place;
 if kind is null then return false; end if;
 is_zone := kind='spot-zone' or exists(select 1 from zc_osp_internal.zones z where z.chat_place_id=p_place);
 if not is_zone then return not p_zone_only; end if;
 if kind<>'spot-zone' or actor is null or not exists(select 1 from auth.users u where u.id=actor
   and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false) then return false; end if;
 return exists(select 1 from zc_osp_internal.zones z
   join public.zc_public_spots s on s.id=z.source_spot_id
   join zc_osp_internal.memberships m on m.zone_id=z.id and m.user_id=actor
   where z.chat_place_id=p_place and z.approved and s.state='approved' and s.reviewed_at is not null
    and not exists(select 1 from zc_osp_internal.bans b where b.zone_id=z.id and b.user_id=actor));
end$$;

create policy osp_place_boundary on public.chat_places as restrictive for select to authenticated
 using(zc_osp_internal.can_access_place(id,false));
-- Zone provisioning stays operator-only even if another permissive geographic policy exists.
create policy osp_place_insert_boundary on public.chat_places as restrictive for insert to authenticated
 with check(level<>'spot-zone');
create policy osp_place_update_boundary on public.chat_places as restrictive for update to authenticated
 using(level<>'spot-zone' and zc_osp_internal.can_access_place(id,false))
 with check(level<>'spot-zone' and zc_osp_internal.can_access_place(id,false));
create policy osp_place_delete_boundary on public.chat_places as restrictive for delete to authenticated
 using(level<>'spot-zone' and zc_osp_internal.can_access_place(id,false));
create policy osp_message_boundary on public.chat_messages as restrictive for all to authenticated
 using(zc_osp_internal.can_access_place(place_id,false))
 with check(zc_osp_internal.can_access_place(place_id,false));
create policy osp_member_message_insert on public.chat_messages for insert to authenticated
 with check(user_id=(select auth.uid()) and zc_osp_internal.can_access_place(place_id,true));
create policy osp_read_marker_boundary on public.chat_read_state as restrictive for all to authenticated
 using(zc_osp_internal.can_access_place(place_id,false))
 with check(zc_osp_internal.can_access_place(place_id,false));
-- Existing photo and reaction read/insert policies already require a visible parent message.
-- Keep those policies/grants and the existing JWT media brokers unchanged.

create function public.zc_osp_catalog() returns table(
 zone_id uuid,chat_place_id uuid,name text,area_label text,country_code text,is_member boolean)
language plpgsql stable security definer set search_path=pg_catalog,public,auth,zc_osp_internal as $$
declare actor uuid := zc_osp_internal.require_actor();
begin
 return query select z.id,z.chat_place_id,z.name,z.area_label,z.country_code,m.user_id is not null
 from zc_osp_internal.zones z join public.zc_public_spots s on s.id=z.source_spot_id
 join public.chat_places p on p.id=z.chat_place_id and p.level='spot-zone' and p.country_code=z.country_code
 left join zc_osp_internal.memberships m on m.zone_id=z.id and m.user_id=actor
 where z.approved and s.state='approved' and s.reviewed_at is not null
  and not exists(select 1 from zc_osp_internal.bans b where b.zone_id=z.id and b.user_id=actor)
 order by z.name,z.id limit 100;
end$$;

create function public.zc_osp_join(p_zone uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public,auth,zc_osp_internal as $$
declare actor uuid := zc_osp_internal.require_actor(); room uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('osp-membership:'||actor::text,0));
 select z.chat_place_id into room from zc_osp_internal.zones z
 join public.zc_public_spots s on s.id=z.source_spot_id
 join public.chat_places p on p.id=z.chat_place_id and p.level='spot-zone' and p.country_code=z.country_code
 where z.id=p_zone and z.approved and s.state='approved' and s.reviewed_at is not null
  and not exists(select 1 from zc_osp_internal.bans b where b.zone_id=z.id and b.user_id=actor)
 for share of z,s;
 if room is null then raise exception 'Zone unavailable' using errcode='42501'; end if;
 if exists(select 1 from zc_osp_internal.memberships m where m.zone_id=p_zone and m.user_id=actor)
 then return room; end if;
 if (select count(*) from zc_osp_internal.memberships m where m.user_id=actor)>=10
 then raise exception 'Active zone membership limit reached' using errcode='22023'; end if;
 insert into zc_osp_internal.memberships(zone_id,user_id) values(p_zone,actor);
 return room;
end$$;
create function public.zc_osp_leave(p_zone uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public,auth,zc_osp_internal as $$
declare actor uuid := zc_osp_internal.require_actor();
begin
 perform pg_advisory_xact_lock(hashtextextended('osp-membership:'||actor::text,0));
 delete from zc_osp_internal.memberships m where m.zone_id=p_zone and m.user_id=actor;
 -- Leave never erases a ban, grants presence/photo consent or alters another account.
end$$;

create or replace function public.chat_room_read_summary(p_place uuid)
returns table(topic text,joined boolean,unread bigint)
language sql stable security invoker set search_path='' as $$
 select t.topic,r.user_id is not null,count(m.id) filter(where m.user_id<>auth.uid() and m.created_at>coalesce(r.last_read_at,'-infinity'::timestamptz))
 from unnest(array['general','reports','waters','partners','gear','tips']) t(topic)
 left join public.chat_read_state r on r.user_id=auth.uid() and r.place_id=p_place and r.topic=t.topic
 left join public.chat_messages m on m.place_id=p_place and m.topic=t.topic
 -- Resolve through the existing RLS-protected relation. The invoker never needs private-schema USAGE.
 where auth.uid() is not null and exists(select 1 from public.chat_places p where p.id=p_place)
 group by t.topic,r.user_id
$$;
revoke all on all functions in schema zc_osp_internal from public,anon,authenticated;
grant execute on function zc_osp_internal.can_access_place(uuid,boolean) to authenticated;
revoke all on function public.zc_osp_catalog(),public.zc_osp_join(uuid),public.zc_osp_leave(uuid) from public,anon,authenticated;
grant execute on function public.zc_osp_catalog(),public.zc_osp_join(uuid),public.zc_osp_leave(uuid) to authenticated;
notify pgrst,'reload schema';
