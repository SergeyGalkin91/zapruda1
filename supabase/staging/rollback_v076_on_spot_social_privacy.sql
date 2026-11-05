-- STAGING-only shutdown. Retain consent barriers, blocks and operator evidence.
-- Ordinary report-photo access and established chat remain in place.
revoke all on function public.zc_osp_social(text,uuid,jsonb),public.zc_osp_shared_photo_access(uuid)
 from public,anon,authenticated;
create or replace function zc_osp_internal.shared_photo_allowed(p_photo uuid,p_actor uuid) returns boolean
language sql stable set search_path=pg_catalog as $$ select false $$;
notify pgrst,'reload schema';
