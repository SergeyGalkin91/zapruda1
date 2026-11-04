-- v0.7.5 SPOT: authenticated single-fish street/UL pilot, STAGING only
-- NO production operations. Public SECURITY DEFINER endpoints have explicit auth checks.
create table if not exists zc_spot_internal.moderators(
 user_id uuid primary key references auth.users(id),
 assigned_at timestamptz not null default now()
);
alter table zc_spot_internal.moderators enable row level security;
revoke all on zc_spot_internal.moderators from public,anon,authenticated;
grant select,insert,update,delete on zc_spot_internal.moderators to service_role;
-- No moderator is provisioned by this migration; explicit trusted onboarding required.

create table if not exists public.zc_spot_subscriptions(
 user_id uuid not null references auth.users(id) on delete cascade,
 spot_id uuid not null references public.zc_public_spots(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,spot_id)
);
alter table public.zc_spot_subscriptions enable row level security;
revoke all on public.zc_spot_subscriptions from public,anon,authenticated;
grant select,insert,delete on public.zc_spot_subscriptions to authenticated;
grant all on public.zc_spot_subscriptions to service_role;
create policy zc_sub_owner_read on public.zc_spot_subscriptions for select to authenticated
 using ((select auth.uid())=user_id);
create policy zc_sub_owner_insert on public.zc_spot_subscriptions for insert to authenticated
 with check (
  (select auth.uid())=user_id
  and exists(select 1 from public.zc_public_spots s where s.id=spot_id and s.state='approved')
 );
create policy zc_sub_owner_delete on public.zc_spot_subscriptions for delete to authenticated
 using ((select auth.uid())=user_id);

create table if not exists public.zc_spot_notifications(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 category_id uuid not null references zc_spot_internal.categories(id),
 catch_id uuid not null references zc_spot_internal.catches(id),
 message text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id,category_id,catch_id)
);
alter table public.zc_spot_notifications enable row level security;
revoke all on public.zc_spot_notifications from public,anon,authenticated;
grant select,update on public.zc_spot_notifications to authenticated;
grant all on public.zc_spot_notifications to service_role;
grant usage,select on sequence public.zc_spot_notifications_id_seq to service_role;
create policy zc_inbox_read_own on public.zc_spot_notifications for select to authenticated
 using((select auth.uid())=user_id);
create policy zc_inbox_mark_own on public.zc_spot_notifications for update to authenticated
 using((select auth.uid())=user_id)
 with check((select auth.uid())=user_id);
-- Restrict UPDATE to read_at ONLY, preventing client edits to message/recipient/catch.
revoke update on public.zc_spot_notifications from authenticated;
grant update(read_at) on public.zc_spot_notifications to authenticated;

create or replace function public.zc_spot_submit(
 p_spot_id uuid,p_league text,p_species text,p_weight_g integer,p_length_mm integer,
 p_captured_at timestamptz,p_storage_key text
) returns uuid language plpgsql security definer
 set search_path=pg_catalog,public,zc_spot_internal,storage,auth as $$
declare u uuid := auth.uid(); new_id uuid; m text;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null)
 then raise exception 'Verified login required' using errcode='28000'; end if;
 if p_league not in ('street','ultralight') or p_league is null then
  raise exception 'Pilot supports only STREET and UL'; end if;
 if not exists(select 1 from public.zc_public_spots
   where id=p_spot_id and state='approved' and reviewed_at is not null
   and p_league=any(disciplines))
 then raise exception 'Spot not approved for league'; end if;
 if length(trim(coalesce(p_species,''))) not between 2 and 48
    or p_species !~ '^[a-z0-9-]+$' then raise exception 'Invalid species'; end if;
 if p_weight_g is null or p_weight_g not between 1 and 200000
    or p_length_mm is null or p_length_mm not between 1 and 4000
 then raise exception 'Invalid measurements'; end if;
 if p_captured_at is null or p_captured_at>now()+interval '10 minutes'
    or p_captured_at<now()-interval '30 days'
 then raise exception 'Catch date outside pilot window'; end if;
 if p_storage_key is null or length(p_storage_key)>200
    or p_storage_key not like u::text||'/%'
    or not exists (select 1 from storage.objects
      where bucket_id='zc-spot-evidence-staging' and name=p_storage_key and not is_delete_marker)
 then raise exception 'Evidence upload not present in owner folder'; end if;
 m:=case p_league when 'street' then 'shore-spinning' else 'ultralight' end;
 insert into zc_spot_internal.catches(owner_id,league,method,species_id,weight_g,length_mm,captured_at)
 values(u,p_league,m,p_species,p_weight_g,p_length_mm,p_captured_at)
 returning id into new_id;
 insert into zc_spot_internal.evidence(catch_id,private_storage_key,evidence_kind,approved)
 values(new_id,p_storage_key,'photo',false);
 insert into zc_spot_internal.capture_scopes(catch_id,scope_type,scope_id,approved)
 values(new_id,'spot',p_spot_id::text,false);
 return new_id;
end $$;
revoke all on function public.zc_spot_submit(uuid,text,text,integer,integer,timestamptz,text)
 from public,anon,authenticated;
grant execute on function public.zc_spot_submit(uuid,text,text,integer,integer,timestamptz,text)
 to authenticated;

create or replace function public.zc_spot_moderation_queue()
returns table(catch_id uuid,owner_id uuid,league text,species text,weight_g integer,
 length_mm integer,spot_id text,submitted_at timestamptz)
language plpgsql security definer
set search_path=pg_catalog,public,zc_spot_internal,auth as $$
begin
 if auth.uid() is null or not exists(select 1 from zc_spot_internal.moderators where user_id=auth.uid())
 then raise exception 'Moderator access required' using errcode='42501'; end if;
 return query select c.id,c.owner_id,c.league,c.species_id,c.weight_g,c.length_mm,
  s.scope_id,c.created_at
 from zc_spot_internal.catches c join zc_spot_internal.capture_scopes s
  on s.catch_id=c.id and s.scope_type='spot'
 where c.status='pending' order by c.created_at asc limit 100;
end $$;
revoke all on function public.zc_spot_moderation_queue() from public,anon,authenticated;
grant execute on function public.zc_spot_moderation_queue() to authenticated;

create or replace function public.zc_spot_review(
 p_catch_id uuid,p_decision text,p_lawful boolean default false,
 p_ul_gear_valid boolean default false,p_micro_welfare_valid boolean default false
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,zc_spot_internal,storage,auth as $$
declare reviewer uuid:=auth.uid(); c zc_spot_internal.catches%rowtype;
 spotid text; catid uuid; nom text; changed boolean; n int:=0; oldholder uuid;
begin
 if reviewer is null or not exists(select 1 from zc_spot_internal.moderators
       where user_id=reviewer)
 then raise exception 'Moderator access required' using errcode='42501'; end if;
 if p_decision not in ('verified','rejected') or p_decision is null then
  raise exception 'Invalid decision'; end if;
 select * into c from zc_spot_internal.catches where id=p_catch_id for update;
 if not found or c.status<>'pending' then raise exception 'Not pending'; end if;
 select s.scope_id into spotid from zc_spot_internal.capture_scopes s
 where s.catch_id=p_catch_id and s.scope_type='spot';
 if p_decision='verified' then
   if not p_lawful then raise exception 'Lawful catch requires manual confirmation'; end if;
   if c.league='ultralight' and not p_ul_gear_valid then
     raise exception 'UL equipment needs manual confirmation'; end if;
   if not exists(select 1 from public.zc_public_spots p
       where p.id::text=spotid and state='approved' and reviewed_at is not null
         and c.league=any(p.disciplines)) then raise exception 'Spot no longer approved'; end if;
   -- The registered private evidence object is a prerequisite, NOT proof of authenticity.
   if not exists(select 1 from zc_spot_internal.evidence e
       join storage.objects o on o.bucket_id='zc-spot-evidence-staging'
           and o.name=e.private_storage_key and not o.is_delete_marker
       where e.catch_id=c.id) then raise exception 'Evidence missing'; end if;
   update zc_spot_internal.catches set lawful=true,
       ul_gear_approved=(c.league='ultralight' and p_ul_gear_valid),
       micro_welfare_approved=(c.league='ultralight' and p_micro_welfare_valid)
     where id=c.id;
   update zc_spot_internal.evidence set approved=true where catch_id=c.id;
   update zc_spot_internal.capture_scopes set approved=true where catch_id=c.id and scope_type='spot';
 end if;
 perform zc_spot_internal.moderate_catch(c.id,reviewer,p_decision);
 if p_decision='verified' then
   for nom in select unnest(
     case when c.league='street' then array['spot-big-fish','spot-longest']::text[]
          when p_micro_welfare_valid then array['ul-big-fish','ul-smallest']::text[]
          else array['ul-big-fish']::text[] end)
   loop
     insert into zc_spot_internal.categories(league,nomination,method,scope_type,scope_id)
     values(c.league,nom,c.method,'spot',spotid)
     on conflict do nothing;
     select id into catid from zc_spot_internal.categories
       where league=c.league and nomination=nom and method=c.method
         and scope_type='spot' and scope_id=spotid and species_id is null and season_id is null;
     select th.catch_id into oldholder from zc_spot_internal.title_holders th where category_id=catid;
     changed:=zc_spot_internal.award_verified_catch(c.id,catid);
     if changed then
       n:=n+1;
       insert into public.zc_spot_notifications(user_id,category_id,catch_id,message)
       select s.user_id,catid,c.id,case nom
        when 'spot-big-fish' then 'Новый KING OF THE SPOT'
        when 'spot-longest' then 'Новый LENGTH KING'
        when 'ul-big-fish' then 'Новый KING OF UL'
        else 'Новый MICRO KING' end
       from public.zc_spot_subscriptions s where s.spot_id::text=spotid
       union
       select prior.owner_id,catid,c.id,case nom
        when 'spot-big-fish' then 'Ваш рекорд KING OF THE SPOT побит'
        when 'spot-longest' then 'Ваш рекорд LENGTH KING побит'
        when 'ul-big-fish' then 'Ваш рекорд KING OF UL побит'
        else 'Ваш рекорд MICRO KING побит' end
       from zc_spot_internal.catches prior where prior.id=oldholder
       on conflict(user_id,category_id,catch_id) do nothing;
       update zc_spot_internal.notification_outbox set delivered_at=now()
       where category_id=catid and catch_id=c.id;
     end if;
   end loop;
 end if;
 return jsonb_build_object('decision',p_decision,'titles_changed',n);
end $$;
revoke all on function public.zc_spot_review(uuid,text,boolean,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.zc_spot_review(uuid,text,boolean,boolean,boolean)
 to authenticated;

-- Read-only own pending/verified status; no exposed original image keys/locations.
create or replace function public.zc_spot_my_catches()
returns table(catch_id uuid,league text,species text,weight_g integer,length_mm integer,
 status text,created_at timestamptz)
language sql security definer set search_path=pg_catalog,zc_spot_internal,auth as $$
select id,league,species_id,weight_g,length_mm,status,created_at
 from zc_spot_internal.catches where owner_id=auth.uid() order by created_at desc limit 100;
$$;
revoke all on function public.zc_spot_my_catches() from public,anon,authenticated;
grant execute on function public.zc_spot_my_catches() to authenticated;
