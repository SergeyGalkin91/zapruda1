-- STAGING-only: avoid stale predecessor notifications under competing verified catches.
CREATE OR REPLACE FUNCTION public.zc_spot_review(p_catch_id uuid, p_decision text, p_lawful boolean DEFAULT false, p_ul_gear_valid boolean DEFAULT false, p_micro_welfare_valid boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'zc_spot_internal', 'storage', 'auth'
AS $function$
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
 if c.owner_id=reviewer then raise exception 'Moderator cannot review own catch' using errcode='42501'; end if;
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

     changed:=zc_spot_internal.award_verified_catch(c.id,catid);
     if changed then
       -- Read actual predecessor from the serialized winner transition, never before the lock.
       select h.old_catch_id into oldholder from zc_spot_internal.title_history h
       where h.category_id=catid and h.new_catch_id=c.id order by h.id desc limit 1;
       n:=n+1;
       insert into public.zc_spot_notifications(user_id,category_id,catch_id,message)
       select s.user_id,catid,c.id,case nom
        when 'spot-big-fish' then 'Новый KING OF THE SPOT'
        when 'spot-longest' then 'Новый LENGTH KING'
        when 'ul-big-fish' then 'Новый KING OF UL'
        else 'Новый MICRO KING' end
       from public.zc_spot_subscriptions s where s.spot_id::text=spotid and s.league=c.league
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
end $function$;
