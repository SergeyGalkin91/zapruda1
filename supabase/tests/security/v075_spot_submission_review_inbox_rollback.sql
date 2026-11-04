-- STAGING-only SQL role-simulation acceptance; all fixture records ROLLBACK.
-- This checks role-based SQL under emulated auth.uid; NOT real JWT/browser/Storage bytes E2E.
BEGIN;
select set_config('zc.qa.claimant',(select id::text from auth.users where email_confirmed_at is not null order by created_at limit 1),true);
select set_config('zc.qa.reviewer',(select id::text from auth.users where email_confirmed_at is not null order by created_at offset 1 limit 1),true);
DO $qa$
declare owner uuid:=current_setting('zc.qa.claimant')::uuid;
        reviewer uuid:=current_setting('zc.qa.reviewer')::uuid;
        spot uuid;
begin
  if owner is null or reviewer is null or owner=reviewer then
    raise exception 'Need two distinct confirmed STAGING users';
  end if;
  insert into zc_spot_internal.moderators(user_id) values(reviewer);
  insert into public.zc_public_spots(name,city,region,waterbody_name,
        public_lat,public_lng,disciplines,state,reviewed_at)
    values('QA_ROLLBACK_Street_NN','Нижний Новгород','Нижегородская область','Ока',
        56.25,43.95,array['street','ultralight']::text[],'approved',now())
    returning id into spot;
  perform set_config('zc.qa.spot',spot::text,true);
  insert into storage.objects(bucket_id,name)
    values('zc-spot-evidence-staging',owner::text||'/qa-rollback-photo.jpg');
end $qa$;
SET LOCAL ROLE authenticated;
select set_config('request.jwt.claim.sub',current_setting('zc.qa.claimant'),true);
DO $qa$
declare spot uuid:=current_setting('zc.qa.spot')::uuid;
        rec uuid;
begin
  insert into public.zc_spot_subscriptions(user_id,spot_id)
    values(auth.uid(),spot);
  rec:=public.zc_spot_submit(
    spot,'street','pike',17000,1200,now(),
    auth.uid()::text||'/qa-rollback-photo.jpg'
  );
  perform set_config('zc.qa.catch',rec::text,true);
  begin
    perform public.zc_spot_review(rec,'verified',true,false,false);
    raise exception 'Unauthorized user incorrectly reviewed catch';
  exception when insufficient_privilege then
    null;
  end;
end $qa$;
select set_config('request.jwt.claim.sub',current_setting('zc.qa.reviewer'),true);
DO $qa$
declare rec uuid:=current_setting('zc.qa.catch')::uuid;
        val jsonb;
begin
  if (select count(*) from public.zc_spot_moderation_queue() where catch_id=rec)<>1
  then raise exception 'Pending row not visible to moderator'; end if;
  if public.zc_spot_evidence_key(rec) is null
  then raise exception 'Cannot access evidence key as moderator'; end if;
  val:=public.zc_spot_review(rec,'verified',true,false,false);
  if (val->>'titles_changed')::int <>2
  then raise exception 'Expected KING and LENGTH KING: %',val; end if;
  if exists(select 1 from public.zc_spot_notifications)
  then raise exception 'Moderator unexpectedly received claimant notification'; end if;
end $qa$;
select set_config('request.jwt.claim.sub',current_setting('zc.qa.claimant'),true);
DO $qa$
declare rec uuid:=current_setting('zc.qa.catch')::uuid;
begin
  if (select count(*) from public.zc_spot_notifications)<>2
  then raise exception 'Subscribed claimant missing 2 scoped in-app notifications'; end if;
  if (select count(*) from public.zc_spot_my_catches() where catch_id=rec and status='verified')<>1
  then raise exception 'Verified catch missing from owner view'; end if;
end $qa$;
RESET ROLE;
ROLLBACK;
select (select count(*) from zc_spot_internal.catches) as persisted_catches,
       (select count(*) from zc_spot_internal.title_holders) as persisted_titles,
       (select count(*) from public.zc_spot_notifications) as persisted_notifications,
       (select count(*) from zc_spot_internal.moderators) as persistent_moderators,
       (select count(*) from public.zc_public_spots) as published_spots;
