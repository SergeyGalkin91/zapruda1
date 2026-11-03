-- v0.7.5 SPOT | STAGING RLS impersonation test, NOT signed HTTP JWT E2E.
-- Rollback-only; temp role emulation tests PostgreSQL RLS.
begin;
do $qa$
declare person_a uuid; person_b uuid; sp uuid; ca uuid; ct uuid;
begin
 select id into person_a from auth.users where email_confirmed_at is not null order by created_at limit 1;
 select id into person_b from auth.users where email_confirmed_at is not null and id<>person_a order by created_at limit 1;
 if person_a is null or person_b is null then raise exception 'Two confirmed STAGING users required'; end if;
 insert into public.zc_public_spots(name,city,region,waterbody_name,public_lat,public_lng,disciplines,state,reviewed_at)
 values('RLS QA PRIVATE CHECK','Нижний Новгород','Нижегородская область','Ока',56.3,44.0,array['street','ultralight'],'approved',now())
 returning id into sp;
 insert into zc_spot_internal.catches(owner_id,league,method,species_id,weight_g,length_mm,captured_at)
 values(person_a,'street','shore-spinning','pike',3200,800,now()) returning id into ca;
 insert into zc_spot_internal.categories(league,nomination,method,scope_type,scope_id)
 values('street','spot-big-fish','shore-spinning','spot',sp::text) returning id into ct;
 insert into public.zc_spot_notifications(user_id,category_id,catch_id,message)
 values(person_a,ct,ca,'PRIVATE RLS QA'),(person_b,ct,ca,'OTHER USER RLS QA');
 perform set_config('request.jwt.claim.sub',person_a::text,true);
end $qa$;
set local role authenticated;
do $qa$
declare observed int; owns int;
begin
 select count(*) into observed from public.zc_spot_notifications
 where message in ('PRIVATE RLS QA','OTHER USER RLS QA');
 select count(*) into owns from public.zc_spot_notifications where message='PRIVATE RLS QA';
 if observed<>1 or owns<>1 then raise exception 'Notification RLS exposed another user'; end if;
 if has_table_privilege(current_user,'zc_spot_internal.catches','SELECT') then
  raise exception 'Authenticated role has private catch SELECT';
 end if;
end $qa$;
reset role;
rollback;
select (select count(*) from public.zc_spot_notifications where message like '%RLS QA%') as leaked_fixtures;