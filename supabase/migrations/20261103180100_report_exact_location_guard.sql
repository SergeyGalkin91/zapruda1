-- Portable strict contract: legacy public exact fields are always NULL.
-- Preserve complete legacy pairs in existing owner-only storage before clearing.
lock table public.fishing_reports in share row exclusive mode;
do $$
begin
  if exists(select 1 from public.fishing_reports where
    (latitude is null) <> (longitude is null) or
    (latitude is not null and not (latitude between -90 and 90 and longitude between -180 and 180))) then
    raise exception 'Review invalid or incomplete legacy GPS before migration';
  end if;
  if exists(select 1 from public.fishing_reports r join public.report_private_locations p on p.report_id=r.id
    where r.latitude is not null and (p.user_id<>r.user_id or p.latitude<>r.latitude or p.longitude<>r.longitude)) then
    raise exception 'Review conflicting private GPS before migration';
  end if;
end;
$$;
insert into public.report_private_locations(report_id,user_id,latitude,longitude)
select id,user_id,latitude,longitude from public.fishing_reports where latitude is not null
on conflict(report_id) do nothing;
update public.fishing_reports set latitude=null,longitude=null where latitude is not null or longitude is not null;
alter table public.fishing_reports drop constraint if exists fishing_reports_no_exact_public_columns;
alter table public.fishing_reports add constraint fishing_reports_no_exact_public_columns
  check(latitude is null and longitude is null);
-- An AFTER transfer trigger cannot satisfy a BEFORE-checked strict constraint.
-- Exact-location clients must use report_private_locations under owner RLS.
drop trigger if exists zapruda_move_exact_coordinates on public.fishing_reports;

create or replace function public.zapruda_round_approximate_coords() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.approximate_latitude is not null then
    new.approximate_latitude:=round(new.approximate_latitude::numeric,2);
  end if;
  if new.approximate_longitude is not null then
    new.approximate_longitude:=round(new.approximate_longitude::numeric,2);
  end if;
  return new;
end;
$$;
revoke all on function public.zapruda_round_approximate_coords() from public,anon,authenticated;
drop trigger if exists fishing_reports_round_approx_coords on public.fishing_reports;
create trigger fishing_reports_round_approx_coords before insert or update on public.fishing_reports
for each row execute function public.zapruda_round_approximate_coords();

alter table public.report_private_locations enable row level security;
revoke all on public.report_private_locations from public,anon,authenticated;
grant select,insert,update,delete on public.report_private_locations to authenticated;
grant all on public.report_private_locations to service_role;
drop policy if exists "Private GPS owner access" on public.report_private_locations;
drop policy if exists "Private GPS owner boundary" on public.report_private_locations;
create policy "Private GPS owner access" on public.report_private_locations
for all to authenticated using (user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
)) with check (user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
));
create policy "Private GPS owner boundary" on public.report_private_locations as restrictive
for all to anon,authenticated using (user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
)) with check (user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
));
