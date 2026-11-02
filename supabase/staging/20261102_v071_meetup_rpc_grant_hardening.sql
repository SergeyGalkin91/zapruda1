-- STAGING security fix: Supabase project-specific default EXECUTE grants to anon/authenticated.
-- Only safe read-only occupancy and accepted-member predicate callable by authenticated.
revoke execute on function public.meetup_is_accepted(uuid) from anon, authenticated;
revoke execute on function public.meetup_occupancy(uuid) from anon, authenticated;
revoke execute on function public.meetup_member_guard() from anon, authenticated;
revoke execute on function public.meetup_owner_bootstrap() from anon, authenticated;
revoke execute on function public.meetup_post_guard() from anon, authenticated;
revoke execute on function public.meetup_private_details_guard() from anon, authenticated;
grant execute on function public.meetup_is_accepted(uuid) to authenticated;
grant execute on function public.meetup_occupancy(uuid) to authenticated;
do $$
declare name text; permitted boolean;
begin
 for name in select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('meetup_is_accepted','meetup_occupancy','meetup_member_guard','meetup_owner_bootstrap','meetup_post_guard','meetup_private_details_guard')
 loop
  select has_function_privilege('anon',p.oid,'EXECUTE') into permitted from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=name;
  if permitted then raise exception 'ANON_EXEC_GRANT_SURVIVES: %',name; end if;
 end loop;
end $$;
