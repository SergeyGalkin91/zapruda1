-- Applied to STAGING only. SECURITY INVOKER. Not approved for production.
create or replace function public.toggle_report_reaction_atomic(p_report_id uuid,p_reaction_type text)
returns text language plpgsql security invoker set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_previous text;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_reaction_type is null or p_reaction_type not in ('like','fire','heart','laugh','fish','clap','support') then raise exception 'Unsupported reaction' using errcode='22023'; end if;
 if not exists(select 1 from public.fishing_reports where id=p_report_id and is_public) then raise exception 'Report unavailable' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_report_id::text || ':' || v_user::text,0));
 select reaction_type into v_previous from public.reactions where report_id=p_report_id and user_id=v_user for update;
 if v_previous=p_reaction_type then
   delete from public.reactions where report_id=p_report_id and user_id=v_user;
   return 'removed';
 end if;
 insert into public.reactions(report_id,user_id,reaction_type) values(p_report_id,v_user,p_reaction_type)
 on conflict(report_id,user_id) do update set reaction_type=excluded.reaction_type;
 return case when v_previous is null then 'added' else 'switched' end;
end $$;
revoke all on function public.toggle_report_reaction_atomic(uuid,text) from public,anon;
grant execute on function public.toggle_report_reaction_atomic(uuid,text) to authenticated;
