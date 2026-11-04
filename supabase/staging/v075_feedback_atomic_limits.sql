-- STAGING ONLY yudtbifopfnjtjanaqrd. Not an automatic production migration.
-- Existing community_requests/RLS and owner policy are retained, not recreated.
-- The UI filters its history by user_id; this own-row column needs SELECT too.
grant select(user_id) on public.community_requests to authenticated;

-- Service-only invoker RPC: the Edge broker already verifies the real confirmed
-- nonanonymous Auth user. A client cannot call this RPC or choose another UID.
-- The per-user transaction lock serializes count+insert across Edge isolates.
create function public.submit_community_request_v075(
 p_user_id uuid, p_request_type text, p_category text,
 p_subject text, p_body text, p_contact text
) returns uuid language plpgsql volatile security invoker set search_path='' as $$
declare
 v_now timestamptz;
 v_hour bigint;
 v_day bigint;
 v_id uuid;
begin
 if p_user_id is null
    or p_request_type is null or p_request_type not in ('improvement','cooperation','bug')
    or p_category is null or length(p_category)>80
    or p_subject is null or length(btrim(p_subject)) not between 4 and 120
    or p_body is null or length(btrim(p_body)) not between 15 and 2000
    or p_contact is null or length(p_contact)>180 then
   raise exception using errcode='22023',message='FEEDBACK_INVALID_INPUT';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zapruda-feedback-v075:'||p_user_id::text,0));
 v_now := pg_catalog.clock_timestamp();
 select count(*) filter(where created_at>=v_now-interval '1 hour'),count(*)
   into v_hour,v_day from public.community_requests
   where user_id=p_user_id and created_at>=v_now-interval '24 hours';
 if v_hour>=5 or v_day>=15 then
   raise exception using errcode='P0001',message='FEEDBACK_RATE_LIMITED';
 end if;
 insert into public.community_requests(user_id,request_type,category,subject,body,contact,created_at)
 values(p_user_id,p_request_type,p_category,btrim(p_subject),btrim(p_body),btrim(p_contact),v_now)
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.submit_community_request_v075(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_community_request_v075(uuid,text,text,text,text,text) to service_role;

-- No body/contact read, direct INSERT/UPDATE/DELETE, RLS or Telegram change.
