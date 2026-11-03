-- v0.7.5 STAGING hardening: ensure evidence object is registered in the PRIVATE bucket before verification and title award.
create or replace function zc_spot_internal.moderate_catch(
 p_catch_id uuid, p_reviewer_id uuid, p_decision text
) returns boolean language plpgsql security invoker set search_path = pg_catalog, zc_spot_internal as $$
declare c zc_spot_internal.catches%rowtype;
begin
  if p_decision not in ('verified','rejected') then raise exception 'Invalid decision'; end if;
  if not exists(select 1 from auth.users where id=p_reviewer_id) then raise exception 'Unknown reviewer'; end if;
  select * into c from zc_spot_internal.catches where id=p_catch_id for update;
  if not found or c.status <> 'pending' then raise exception 'Catch not pending'; end if;
  if p_decision='verified' then
    if not c.lawful
     or not exists(
       select 1 from zc_spot_internal.evidence e
       join storage.objects o on o.bucket_id='zc-spot-evidence-staging'
          and o.name=e.private_storage_key and not o.is_delete_marker
       where e.catch_id=p_catch_id and e.approved
     )
     or not exists(select 1 from zc_spot_internal.capture_scopes where catch_id=p_catch_id and approved)
    then raise exception 'Missing lawful, proof or territory verification'; end if;
  end if;
  update zc_spot_internal.catches set status=p_decision where id=p_catch_id;
  insert into zc_spot_internal.moderation_events(catch_id,reviewer_id,decision)
     values(p_catch_id,p_reviewer_id,p_decision);
  return true;
end $$;
revoke all on function zc_spot_internal.moderate_catch(uuid,uuid,text) from public, anon, authenticated;
grant execute on function zc_spot_internal.moderate_catch(uuid,uuid,text) to service_role;

-- Atomic current-holder election, with transaction-scoped serialization for the first crown.
-- Return true only after an actual first crown or improved record.
create or replace function zc_spot_internal.award_verified_catch(
 p_catch_id uuid, p_category_id uuid
) returns boolean language plpgsql security invoker set search_path = pg_catalog, zc_spot_internal as $$
declare c zc_spot_internal.catches%rowtype;
        cat zc_spot_internal.categories%rowtype;
        old_id uuid; old_score int; new_score int; improve boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_category_id::text, 101));
  select * into c from zc_spot_internal.catches where id=p_catch_id;
  select * into cat from zc_spot_internal.categories where id=p_category_id;
  if c.id is null or cat.id is null then raise exception 'Unknown catch or category'; end if;
  if c.status<>'verified' or not c.lawful
    or c.league<>cat.league or c.method<>cat.method
    or (cat.species_id is not null and cat.species_id<>c.species_id)
    or (cat.season_id is not null and cat.season_id is distinct from c.season_id)
    or (cat.league='ultralight' and not c.ul_gear_approved)
    or (cat.nomination='ul-smallest' and not c.micro_welfare_approved)
    or not exists(
      select 1 from zc_spot_internal.evidence e
      join storage.objects o on o.bucket_id='zc-spot-evidence-staging'
         and o.name=e.private_storage_key and not o.is_delete_marker
      where e.catch_id=c.id and e.approved
    )
    or not exists(select 1 from zc_spot_internal.capture_scopes where catch_id=c.id
      and scope_type=cat.scope_type and scope_id=cat.scope_id and approved)
  then raise exception 'Catch ineligible for category'; end if;
  if cat.nomination in ('spot-longest','ul-smallest') then new_score:=c.length_mm;
  else new_score:=c.weight_g; end if;
  if new_score is null or new_score<=0 then raise exception 'Missing verified measurement'; end if;
  select catch_id,score into old_id,old_score from zc_spot_internal.title_holders
    where category_id=p_category_id for update;
  if old_id=p_catch_id then return false; end if;
  improve:=old_id is null or
     (case when cat.nomination='ul-smallest' then new_score < old_score
           else new_score > old_score end);
  if not improve then return false; end if;
  insert into zc_spot_internal.title_holders(category_id,catch_id,score,updated_at)
    values(p_category_id,p_catch_id,new_score,now())
    on conflict(category_id) do update set catch_id=excluded.catch_id,
        score=excluded.score,updated_at=excluded.updated_at;
  insert into zc_spot_internal.title_history(category_id,old_catch_id,new_catch_id,new_score)
    values(p_category_id,old_id,p_catch_id,new_score);
  insert into zc_spot_internal.notification_outbox(event_key,category_id,catch_id)
    values(jsonb_build_array('title_changed',p_category_id,p_catch_id)::text,p_category_id,p_catch_id)
    on conflict(event_key) do nothing;
  return true;
end $$;
revoke all on function zc_spot_internal.award_verified_catch(uuid,uuid) from public, anon, authenticated;
grant execute on function zc_spot_internal.award_verified_catch(uuid,uuid) to service_role;
