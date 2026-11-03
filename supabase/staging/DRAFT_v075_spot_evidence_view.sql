-- Evidence visible only to an explicitly provisioned moderator through a 60-sec signed link.
create or replace function public.zc_spot_evidence_key(p_catch_id uuid)
returns text language plpgsql security definer
set search_path=pg_catalog,public,zc_spot_internal,auth as $$
declare result_key text;
begin
 if auth.uid() is null or not exists(select 1 from zc_spot_internal.moderators
  where user_id=auth.uid())
 then raise exception 'Moderator access required' using errcode='42501'; end if;
 select e.private_storage_key into result_key from zc_spot_internal.evidence e
 where e.catch_id=p_catch_id order by e.created_at limit 1;
 if result_key is null then raise exception 'Evidence missing'; end if;
 return result_key;
end $$;
revoke all on function public.zc_spot_evidence_key(uuid) from public,anon,authenticated;
grant execute on function public.zc_spot_evidence_key(uuid) to authenticated;
create unique index if not exists zc_spot_evidence_one_file_one_catch
 on zc_spot_internal.evidence(private_storage_key);
