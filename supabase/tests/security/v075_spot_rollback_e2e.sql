-- Rollback-only automated acceptance for v0.7.5 SPOT on STAGING.
-- No lasting data changes; uses an existing Auth user without emitting personal data.
begin;
do $qa$
declare owner_uuid uuid; a uuid; b uuid; cat uuid; proof_uuid uuid; v_score int; holder uuid; changed boolean;
begin
  select id into owner_uuid from auth.users order by created_at limit 1;
  if owner_uuid is null then raise exception 'Missing STAGING test principal'; end if;
  if has_table_privilege('anon','zc_spot_internal.catches','SELECT') or
     has_table_privilege('authenticated','zc_spot_internal.catches','SELECT') or
     has_function_privilege('anon','zc_spot_internal.award_verified_catch(uuid,uuid)','EXECUTE') or
     has_function_privilege('authenticated','zc_spot_internal.moderate_catch(uuid,uuid,text)','EXECUTE')
  then raise exception 'PRIVATE ACCESS DENIED test failed'; end if;
  insert into zc_spot_internal.categories(league,nomination,method,scope_type,scope_id,species_id)
   values('boat','boat-big-fish','boat-spinning','region','52','pike') returning id into cat;
  insert into zc_spot_internal.catches(owner_id,league,method,species_id,weight_g,length_mm,captured_at,lawful)
   values(owner_uuid,'boat','boat-spinning','pike',17000,1200,now(),true) returning id into a;
  insert into zc_spot_internal.evidence(catch_id,private_storage_key,evidence_kind,approved)
   values(a,'qa-rollback/never-public.jpg','scale',true);
  insert into zc_spot_internal.capture_scopes(catch_id,scope_type,scope_id,approved)
   values(a,'region','52',true);
  begin
    changed:=zc_spot_internal.award_verified_catch(a,cat);
    raise exception 'Unverified catch was crowned';
  exception when raise_exception then
    if sqlerrm='Unverified catch was crowned' then raise; end if;
  end;
  if not zc_spot_internal.moderate_catch(a,owner_uuid,'verified') then raise exception 'Cannot verify'; end if;
  if not zc_spot_internal.award_verified_catch(a,cat) then raise exception 'First title not awarded'; end if;
  if zc_spot_internal.award_verified_catch(a,cat) then raise exception 'Double-award same catch'; end if;
  insert into zc_spot_internal.catches(owner_id,league,method,species_id,weight_g,length_mm,captured_at,lawful)
   values(owner_uuid,'boat','boat-spinning','pike',18000,1210,now(),true) returning id into b;
  insert into zc_spot_internal.evidence(catch_id,private_storage_key,evidence_kind,approved)
   values(b,'qa-rollback/never-public-2.jpg','scale',true);
  insert into zc_spot_internal.capture_scopes(catch_id,scope_type,scope_id,approved)
   values(b,'region','52',true);
  perform zc_spot_internal.moderate_catch(b,owner_uuid,'verified');
  if not zc_spot_internal.award_verified_catch(b,cat) then raise exception 'Improved title not awarded'; end if;
  select catch_id,score into holder,v_score from zc_spot_internal.title_holders where category_id=cat;
  if holder<>b or v_score<>18000 then raise exception 'Current holder wrong'; end if;
  if (select count(*) from zc_spot_internal.title_history where category_id=cat)<>2 then raise exception 'Title history missing'; end if;
  if (select count(*) from zc_spot_internal.notification_outbox where category_id=cat)<>2 then raise exception 'Outbox missing'; end if;
  if (select count(*) from public.zc_public_spots where state='approved')<>0 then raise exception 'Unexpected approved spot during QA'; end if;
end;
$qa$;
rollback;
select
  has_table_privilege('anon','zc_spot_internal.catches','SELECT') as anon_catch_select,
  has_function_privilege('authenticated','zc_spot_internal.award_verified_catch(uuid,uuid)','EXECUTE') as user_can_crown,
  (select count(*) from zc_spot_internal.catches) as persistent_catches,
  (select count(*) from zc_spot_internal.title_history) as persistent_titles;
