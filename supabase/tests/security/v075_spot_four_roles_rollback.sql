-- ZAPRUDA v0.7.5 SPOT | STAGING DB ROLE SIMULATION
-- All fixtures are rolled back. This is NOT an HTTP/JWT or actual image-byte E2E.
begin;
do $qa$
declare
  a uuid; b uuid; reviewer uuid; follower uuid;
  spot_id uuid; catch_a uuid; catch_b uuid; first_category uuid;
  result_json jsonb; self_denied boolean:=false; first_notifications integer; all_notifications integer;
  key_a text; key_b text;
begin
  select id into a from auth.users where email_confirmed_at is not null order by created_at limit 1;
  select id into b from auth.users where email_confirmed_at is not null and id<>a order by created_at limit 1;
  select id into reviewer from auth.users where email_confirmed_at is not null and id not in (a,b) order by created_at limit 1;
  select id into follower from auth.users where email_confirmed_at is not null and id not in (a,b,reviewer) order by created_at limit 1;
  if a is null or b is null or reviewer is null or follower is null then
    raise exception 'Requires 4 confirmed STAGING test principals';
  end if;

  insert into public.zc_public_spots(name,city,region,waterbody_name,public_lat,public_lng,disciplines,state,reviewed_at)
  values('QA ROLLBACK SPOT','Нижний Новгород','Нижегородская область','Ока',56.25,43.95,
    array['street','ultralight'], 'approved',now()) returning id into spot_id;

  insert into zc_spot_internal.moderators(user_id) values(reviewer), (a)
    on conflict do nothing;
  insert into public.zc_spot_subscriptions(user_id,spot_id,league)
  values(follower,spot_id,'street'),(b,spot_id,'ultralight');

  key_a:=a::text||'/qa-rollback-a.jpg';
  key_b:=b::text||'/qa-rollback-b.jpg';
  insert into storage.objects(bucket_id,name) values
    ('zc-spot-evidence-staging',key_a),('zc-spot-evidence-staging',key_b);

  perform set_config('request.jwt.claim.sub',a::text,true);
  select public.zc_spot_submit(spot_id,'street','pike',3200,790,now(),key_a)
    into catch_a;
  if (select status from zc_spot_internal.catches where id=catch_a)<>'pending' then
    raise exception 'Submission not pending';
  end if;
  -- A temporarily has moderator role; own-catch verification must be blocked.
  begin
    perform public.zc_spot_review(catch_a,'verified',true,false,false);
  exception when insufficient_privilege then self_denied:=true;
  end;
  if not self_denied then raise exception 'SELF-REVIEW NOT BLOCKED'; end if;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  select public.zc_spot_review(catch_a,'verified',true,false,false) into result_json;
  if (result_json->>'titles_changed')::int<>2 then raise exception 'KING and LENGTH not awarded'; end if;
  if exists(select 1 from public.zc_spot_notifications where user_id=b) then
    raise exception 'Unrelated UL subscriber was notified of STREET title';
  end if;
  select count(*) into first_notifications from public.zc_spot_notifications where user_id=follower;
  if first_notifications<>2 then raise exception 'STREET follower did not receive both titles'; end if;

  perform set_config('request.jwt.claim.sub',b::text,true);
  select public.zc_spot_submit(spot_id,'street','pike',3800,900,now(),key_b) into catch_b;
  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  select public.zc_spot_review(catch_b,'verified',true,false,false) into result_json;
  if (result_json->>'titles_changed')::int<>2 then raise exception 'Challenger not crowned twice'; end if;
  if (select count(*) from zc_spot_internal.title_history where new_catch_id=catch_b)<>2 then
    raise exception 'Missing title history';
  end if;
  if (select count(*) from public.zc_spot_notifications where user_id=a and catch_id=catch_b)<>2 then
    raise exception 'Dethroned champion not notified';
  end if;
  if (select count(*) from public.zc_spot_notifications where user_id=b)<>0 then
    raise exception 'UL subscriber received an unrelated STREET notification';
  end if;
  if (select count(*) from zc_spot_internal.notification_outbox where catch_id in (catch_a,catch_b))<>4 then
    raise exception 'Outbox events not generated';
  end if;

  -- Test role-specific inbox isolation at the DB level, under authenticated role.
  perform set_config('request.jwt.claim.sub',follower::text,true);
  -- RLS ownership checked via auth.uid when role is set in following separate test command.
end
$qa$;
rollback;
select
  (select count(*) from zc_spot_internal.catches) as persisted_catches,
  (select count(*) from zc_spot_internal.title_holders) as persisted_kings,
  (select count(*) from public.zc_public_spots where name='QA ROLLBACK SPOT') as persisted_test_spots;