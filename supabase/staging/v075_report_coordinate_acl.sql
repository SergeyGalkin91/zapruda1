-- STAGING only. The existing strict NULL-coordinate constraint is preserved.
-- Column grants make explicit REST requests for legacy exact fields fail closed.
do $$
declare columns_sql text; role_name text;
begin
  if exists(select 1 from public.fishing_reports where latitude is not null or longitude is not null) then
    raise exception 'Review legacy GPS before changing public read privileges';
  end if;
  select string_agg(quote_ident(attname),',' order by attnum) into columns_sql
    from pg_attribute where attrelid='public.fishing_reports'::regclass
      and attnum>0 and not attisdropped and attname not in ('latitude','longitude');
  revoke select on public.fishing_reports from public,anon,authenticated;
  revoke select(latitude,longitude) on public.fishing_reports from public,anon,authenticated;
  foreach role_name in array array['anon','authenticated'] loop
    execute format('grant select(%s) on public.fishing_reports to %I',columns_sql,role_name);
  end loop;
end $$;

-- Keep the owner predicate effective even if another permissive policy is added.
revoke all on public.report_private_locations from public,anon;
drop policy if exists "Private GPS owner boundary" on public.report_private_locations;
create policy "Private GPS owner boundary" on public.report_private_locations as restrictive
for all to anon,authenticated using (
 user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
 )
) with check (
 user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
 )
);
