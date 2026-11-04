-- REVIEW ONLY. NOT EXECUTED. Requires owner authorization for these NEW five rows.
-- Run only against STAGING yudtbifopfnjtjanaqrd, never Production.
-- The earlier six-row cleanup is complete and is not repeated here.
begin;
do $cleanup$
declare
  ids uuid[] := array[
    '3d450684-f16c-4cd6-aa64-10a52fd2a396',
    '5c9a9b50-89be-4334-83c2-82a3c52f658a',
    '2f4f8496-b0db-421a-bb16-1a89f6e0d3dd',
    'c7bf860f-0e57-495b-b9da-81ddacee5685',
    '192a2eca-c205-4e50-8784-250460219fdd'
  ]::uuid[];
  marker text := 'QA-FEEDBACK-94788aaa-9749-4d4f-be5f-4d551a67c545';
  n integer; owners integer; valid boolean; removed integer;
begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261104133211')
    or not exists(select 1 from supabase_migrations.schema_migrations where version='20261104133529')
  then raise exception 'QA_STAGING_MIGRATION_GUARD'; end if;
  perform 1 from public.community_requests where id=any(ids) for update;
  select count(*), count(distinct user_id), bool_and(
    subject=marker and request_type='bug' and category='Isolated STAGING acceptance'
    and body='Disposable private technical submission for authorized acceptance, not a real support request.'
    and md5(user_id::text)='4249c9f6085946583edc8a38f2881bcb'
    and created_at >= '2026-11-04 15:23:49+00'::timestamptz
    and created_at < '2026-11-04 15:23:51+00'::timestamptz
  ) into n,owners,valid from public.community_requests where id=any(ids);
  if n=0 and not exists(select 1 from public.community_requests where subject=marker) then
    raise notice 'Exact fixtures already absent; no deletion'; return;
  end if;
  if n<>5 or owners<>1 or valid is not true
    or (select count(*) from public.community_requests where subject=marker)<>5
  then raise exception 'QA_EXACT_FIXTURE_GUARD'; end if;
  if exists(select 1 from pg_constraint where contype='f' and confrelid='public.community_requests'::regclass)
  then raise exception 'QA_NEW_INCOMING_FOREIGN_KEY_REQUIRES_REVIEW'; end if;
  delete from public.community_requests where id=any(ids);
  get diagnostics removed=row_count;
  if removed<>5 then raise exception 'QA_DELETE_COUNT_MISMATCH'; end if;
end $cleanup$;
select now() checked_at, count(*) latest_feedback_marker_remaining
from public.community_requests
where subject='QA-FEEDBACK-94788aaa-9749-4d4f-be5f-4d551a67c545';
commit;
