-- ZAPRUDA v0.7.1: STAGING-only meetup foundation; review before apply.
-- Public discovery stores country/region/city only. Precise location and time: PRIVATE table.
create table if not exists public.meetup_posts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 country_code text not null check(length(country_code) between 2 and 3),
 region_code text not null check(length(region_code) between 1 and 100),
 city_code text not null check(length(city_code) between 1 and 120),
 title text not null check(length(btrim(title)) between 4 and 100),
 description text not null default '' check(length(description)<=1500),
 status text not null default 'open' check(status in ('open','closed','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.meetup_members (
 post_id uuid not null references public.meetup_posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'participant' check(role in ('owner','participant')),
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create table if not exists public.meetup_private_details (
 post_id uuid primary key references public.meetup_posts(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 meeting_at timestamptz,
 private_place text check(length(private_place)<=500),
 latitude double precision check(latitude between -90 and 90),
 longitude double precision check(longitude between -180 and 180)
);
create table if not exists public.meetup_messages (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.meetup_posts(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists meetup_posts_geo_idx on public.meetup_posts(country_code,region_code,city_code,status);
create index if not exists meetup_members_user_idx on public.meetup_members(user_id,status);
create index if not exists meetup_messages_post_idx on public.meetup_messages(post_id,created_at);

-- Security-definer checks only for membership existence, never return private data.
create or replace function public.meetup_is_accepted(p_post uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.meetup_members m where m.post_id=p_post and m.user_id=p_user and m.status='accepted')
$$;
revoke all on function public.meetup_is_accepted(uuid,uuid) from public;
grant execute on function public.meetup_is_accepted(uuid,uuid) to authenticated;

create or replace function public.meetup_member_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_status text; v_count integer;
begin
 -- Lock parent row: serializes acceptance and eliminates 3-seat race.
 select p.owner_id,p.status into v_owner,v_status from public.meetup_posts p where p.id=new.post_id for update;
 if v_owner is null then raise exception 'MEETUP_NOT_FOUND'; end if;
 if tg_op='UPDATE' then
   if new.post_id<>old.post_id or new.user_id<>old.user_id or new.role<>old.role or new.created_at<>old.created_at then
     raise exception 'MEETUP_IMMUTABLE_MEMBER';
   end if;
   if old.status='accepted' and new.status<>'accepted' then raise exception 'MEETUP_ACCEPTED_IMMUTABLE'; end if;
   if new.status='accepted' and old.status='pending' then
     if auth.uid()<>v_owner or v_status<>'open' then raise exception 'MEETUP_ACCEPT_OWNER_ONLY'; end if;
   elsif new.status='declined' and old.status='pending' then
     if auth.uid()<>new.user_id and auth.uid()<>v_owner then raise exception 'MEETUP_DECLINE_DENIED'; end if;
   elsif new.status is distinct from old.status then raise exception 'MEETUP_TRANSITION_DENIED'; end if;
 else
   if new.user_id=v_owner then
     if auth.uid()<>v_owner or new.role<>'owner' or new.status<>'accepted' then raise exception 'MEETUP_OWNER_BOOTSTRAP'; end if;
   else
     if new.role<>'participant' or new.status<>'pending' or new.user_id<>auth.uid() or v_status<>'open' then
       raise exception 'MEETUP_JOIN_DENIED';
     end if;
   end if;
 end if;
 if new.status='accepted' and (tg_op='INSERT' or old.status is distinct from 'accepted') then
   select count(*) into v_count from public.meetup_members m where m.post_id=new.post_id and m.status='accepted';
   if v_count>=3 then raise exception 'MEETUP_FULL'; end if;
 end if;
 return new;
end $$;
drop trigger if exists meetup_member_guard_trg on public.meetup_members;
create trigger meetup_member_guard_trg before insert or update on public.meetup_members
for each row execute function public.meetup_member_guard();

create or replace function public.meetup_owner_bootstrap()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.meetup_members(post_id,user_id,role,status)
 values(new.id,new.owner_id,'owner','accepted');
 return new;
end $$;
drop trigger if exists meetup_owner_bootstrap_trg on public.meetup_posts;
create trigger meetup_owner_bootstrap_trg after insert on public.meetup_posts
for each row execute function public.meetup_owner_bootstrap();

alter table public.meetup_posts enable row level security;
alter table public.meetup_members enable row level security;
alter table public.meetup_private_details enable row level security;
alter table public.meetup_messages enable row level security;

create policy meetup_posts_read on public.meetup_posts for select to authenticated using(true);
create policy meetup_posts_create on public.meetup_posts for insert to authenticated with check(owner_id=auth.uid());
create policy meetup_posts_update on public.meetup_posts for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy meetup_members_read on public.meetup_members for select to authenticated
 using(user_id=auth.uid() or exists(select 1 from public.meetup_posts p where p.id=post_id and p.owner_id=auth.uid()));
create policy meetup_members_join on public.meetup_members for insert to authenticated with check(user_id=auth.uid());
create policy meetup_members_update on public.meetup_members for update to authenticated
 using(user_id=auth.uid() or exists(select 1 from public.meetup_posts p where p.id=post_id and p.owner_id=auth.uid()))
 with check(user_id=auth.uid() or exists(select 1 from public.meetup_posts p where p.id=post_id and p.owner_id=auth.uid()));
create policy meetup_details_read on public.meetup_private_details for select to authenticated
 using(public.meetup_is_accepted(post_id,auth.uid()));
create policy meetup_details_insert on public.meetup_private_details for insert to authenticated
 with check(owner_id=auth.uid() and exists(select 1 from public.meetup_posts p where p.id=post_id and p.owner_id=auth.uid()));
create policy meetup_details_update on public.meetup_private_details for update to authenticated
 using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy meetup_messages_read on public.meetup_messages for select to authenticated
 using(public.meetup_is_accepted(post_id,auth.uid()));
create policy meetup_messages_insert on public.meetup_messages for insert to authenticated
 with check(sender_id=auth.uid() and public.meetup_is_accepted(post_id,auth.uid()));
grant select,insert,update on public.meetup_posts,public.meetup_members,public.meetup_private_details to authenticated;
grant select,insert on public.meetup_messages to authenticated;
revoke all on public.meetup_posts,public.meetup_members,public.meetup_private_details,public.meetup_messages from anon;
