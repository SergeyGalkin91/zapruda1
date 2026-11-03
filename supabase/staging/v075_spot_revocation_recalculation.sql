-- STAGING delta only. No moderators, spots, catches or titles are provisioned.
-- Keep notification history when an earlier winner is restored after revocation.
alter table public.zc_spot_notifications add column if not exists event_key text;
update public.zc_spot_notifications set event_key=jsonb_build_array('title_changed',category_id,catch_id)::text
where event_key is null;
alter table public.zc_spot_notifications alter column event_key set not null;
alter table public.zc_spot_notifications drop constraint if exists zc_spot_notifications_user_id_category_id_catch_id_key;
create unique index if not exists zc_spot_notification_event_unique on public.zc_spot_notifications(user_id,event_key);
create or replace function zc_spot_internal.notification_event_key() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if new.event_key is null then
  new.event_key:=jsonb_build_array('title_changed',new.category_id,new.catch_id)::text;
 end if;
 return new;
end $$;
revoke all on function zc_spot_internal.notification_event_key() from public,anon,authenticated;
drop trigger if exists zc_spot_notification_event_key on public.zc_spot_notifications;
create trigger zc_spot_notification_event_key before insert on public.zc_spot_notifications
for each row execute function zc_spot_internal.notification_event_key();
alter table zc_spot_internal.moderation_events add column if not exists reason text;
alter table zc_spot_internal.title_history alter column new_catch_id drop not null;
alter table zc_spot_internal.title_history alter column new_score drop not null;
alter table zc_spot_internal.title_history drop constraint if exists zc_spot_history_winner_pair;
alter table zc_spot_internal.title_history add constraint zc_spot_history_winner_pair check (
 (new_catch_id is null and new_score is null) or (new_catch_id is not null and new_score is not null and new_score>0)
);

create or replace function public.zc_spot_revoke(p_catch_id uuid,p_reason text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,zc_spot_internal,storage,auth as $$
declare reviewer uuid:=auth.uid(); source zc_spot_internal.catches%rowtype;
 cat zc_spot_internal.categories%rowtype; previous uuid; winner uuid; winner_owner uuid;
 score_value integer; event_id text; changed integer:=0;
begin
 if reviewer is null or not exists(select 1 from zc_spot_internal.moderators where user_id=reviewer)
 or not exists(select 1 from auth.users where id=reviewer and email_confirmed_at is not null)
 then raise exception 'Moderator access required' using errcode='42501'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 10 and 500
 then raise exception 'A bounded review reason is required' using errcode='22023'; end if;
 -- Status changes never alter the referenced primary key. NO KEY UPDATE permits
 -- FK key-share checks while another revocation is waiting on a category lock.
 select * into source from zc_spot_internal.catches where id=p_catch_id for no key update;
 if not found then raise exception 'Catch not found' using errcode='22023'; end if;
 if source.owner_id=reviewer then raise exception 'Moderator cannot review own catch' using errcode='42501'; end if;
 if source.status='revoked' then return jsonb_build_object('decision','revoked','already_reviewed',true,'titles_changed',0); end if;
 if source.status<>'verified' then raise exception 'Only verified catches can be revoked' using errcode='22023'; end if;
 update zc_spot_internal.catches set status='revoked' where id=p_catch_id;
 insert into zc_spot_internal.moderation_events(catch_id,reviewer_id,decision,reason)
 values(p_catch_id,reviewer,'revoked',btrim(p_reason));
 -- Same category lock and global UUID order as approval, including all crowns.
 for cat in select c.* from zc_spot_internal.categories c
  join zc_spot_internal.title_holders h on h.category_id=c.id
  where h.catch_id=p_catch_id order by c.id
 loop
  perform pg_advisory_xact_lock(hashtextextended(cat.id::text,101));
  select h.catch_id into previous from zc_spot_internal.title_holders h where h.category_id=cat.id for update;
  winner:=null; winner_owner:=null; score_value:=null;
  select c.id,c.owner_id,case when cat.nomination in ('spot-longest','ul-smallest') then c.length_mm else c.weight_g end
  into winner,winner_owner,score_value from zc_spot_internal.catches c
  where c.status='verified' and c.lawful and c.league=cat.league and c.method=cat.method
   and (cat.species_id is null or c.species_id=cat.species_id)
   and (cat.season_id is null or c.season_id=cat.season_id)
   and (cat.league<>'ultralight' or c.ul_gear_approved)
   and (cat.nomination<>'ul-smallest' or c.micro_welfare_approved)
   and (case when cat.nomination in ('spot-longest','ul-smallest') then c.length_mm else c.weight_g end)>0
   and exists(select 1 from zc_spot_internal.capture_scopes s where s.catch_id=c.id
      and s.scope_type=cat.scope_type and s.scope_id=cat.scope_id and s.approved)
   and exists(select 1 from zc_spot_internal.evidence e join storage.objects o
      on o.bucket_id='zc-spot-evidence-staging' and o.name=e.private_storage_key and not o.is_delete_marker
      where e.catch_id=c.id and e.approved)
   and (cat.scope_type<>'spot' or exists(select 1 from public.zc_public_spots p
      where p.id::text=cat.scope_id and p.state='approved' and p.reviewed_at is not null and cat.league=any(p.disciplines)))
  order by
   case when cat.nomination='ul-smallest' then c.length_mm end asc,
   case when cat.nomination='spot-longest' then c.length_mm when cat.nomination<>'ul-smallest' then c.weight_g end desc,
   case when c.id=previous then 0 else 1 end,
   (select min(m.decided_at) from zc_spot_internal.moderation_events m where m.catch_id=c.id and m.decision='verified') asc nulls last,
   c.created_at,c.id limit 1;
  if winner is not distinct from previous then continue; end if;
  if winner is null then delete from zc_spot_internal.title_holders where category_id=cat.id;
  else
   insert into zc_spot_internal.title_holders(category_id,catch_id,score,updated_at)
   values(cat.id,winner,score_value,now()) on conflict(category_id) do update
    set catch_id=excluded.catch_id,score=excluded.score,updated_at=excluded.updated_at;
  end if;
  insert into zc_spot_internal.title_history(category_id,old_catch_id,new_catch_id,new_score)
  values(cat.id,previous,winner,score_value);
  event_id:=jsonb_build_array('catch_revoked',p_catch_id,cat.id)::text;
  insert into zc_spot_internal.notification_outbox(event_key,category_id,catch_id)
  values(event_id,cat.id,p_catch_id) on conflict(event_key) do nothing;
  insert into public.zc_spot_notifications(user_id,category_id,catch_id,message,event_key)
  select recipients.user_id,cat.id,coalesce(winner,p_catch_id),case
   when recipients.user_id=source.owner_id then 'Подтверждение улова отозвано. Титулы пересчитаны.'
   when recipients.user_id=winner_owner then 'Ваш титул KING восстановлен после пересмотра.'
   when winner is null then 'Рекорд пересмотрен. Подтверждённого KING пока нет.'
   else 'Рекорд пересмотрен. Действующий KING обновлён.' end,event_id
  from (select s.user_id from public.zc_spot_subscriptions s
    where s.spot_id::text=cat.scope_id and s.league=cat.league
    union select source.owner_id union select winner_owner where winner_owner is not null) recipients
  on conflict(user_id,event_key) do nothing;
  update zc_spot_internal.notification_outbox set delivered_at=now() where event_key=event_id;
  changed:=changed+1;
 end loop;
 return jsonb_build_object('decision','revoked','titles_changed',changed);
end $$;
revoke all on function public.zc_spot_revoke(uuid,text) from public,anon,authenticated;
grant execute on function public.zc_spot_revoke(uuid,text) to authenticated,service_role;

create or replace function public.zc_spot_reviewed_catches()
returns table(catch_id uuid,owner_id uuid,league text,species text,weight_g integer,length_mm integer,spot_id uuid,submitted_at timestamptz,status text)
language plpgsql security definer set search_path=pg_catalog,public,zc_spot_internal,auth as $$
begin
 if auth.uid() is null or not exists(select 1 from zc_spot_internal.moderators where user_id=auth.uid())
 or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 then raise exception 'Moderator access required' using errcode='42501'; end if;
 return query select c.id,c.owner_id,c.league,c.species_id,c.weight_g,c.length_mm,s.scope_id::uuid,c.created_at,c.status
 from zc_spot_internal.catches c join zc_spot_internal.capture_scopes s on s.catch_id=c.id and s.scope_type='spot'
 where c.status='verified' order by c.created_at desc,c.id limit 100;
end $$;
revoke all on function public.zc_spot_reviewed_catches() from public,anon,authenticated;
grant execute on function public.zc_spot_reviewed_catches() to authenticated,service_role;

-- Approval: repeat safety, confirmed moderators and matching category lock order.
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
 or not exists(select 1 from auth.users where id=reviewer and email_confirmed_at is not null)
 then raise exception 'Moderator access required' using errcode='42501'; end if;
 if p_decision not in ('verified','rejected') or p_decision is null then
  raise exception 'Invalid decision'; end if;
 select * into c from zc_spot_internal.catches where id=p_catch_id for no key update;
 if not found then raise exception 'Not pending'; end if;
 if c.owner_id=reviewer then raise exception 'Moderator cannot review own catch' using errcode='42501'; end if;
 if c.status=p_decision then return jsonb_build_object('decision',p_decision,'already_reviewed',true,'titles_changed',0); end if;
 if c.status<>'pending' then raise exception 'Not pending'; end if;
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
   -- Create and lock every affected category before awarding any one of them.
   insert into zc_spot_internal.categories(league,nomination,method,scope_type,scope_id)
   select c.league,n.nomination,c.method,'spot',spotid from unnest(
    case when c.league='street' then array['spot-big-fish','spot-longest']::text[]
     when p_micro_welfare_valid then array['ul-big-fish','ul-smallest']::text[]
     else array['ul-big-fish']::text[] end) n(nomination)
   order by n.nomination on conflict do nothing;
   for catid in select k.id from zc_spot_internal.categories k
    where k.league=c.league and k.method=c.method and k.scope_type='spot' and k.scope_id=spotid
     and k.species_id is null and k.season_id is null
     and k.nomination=any(case when c.league='street' then array['spot-big-fish','spot-longest']::text[]
       when p_micro_welfare_valid then array['ul-big-fish','ul-smallest']::text[] else array['ul-big-fish']::text[] end)
    order by k.id
   loop perform pg_advisory_xact_lock(hashtextextended(catid::text,101)); end loop;
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
       on conflict(user_id,event_key) do nothing;
       update zc_spot_internal.notification_outbox set delivered_at=now()
       where category_id=catid and catch_id=c.id;
     end if;
   end loop;
 end if;
 return jsonb_build_object('decision',p_decision,'titles_changed',n);
end $function$;
