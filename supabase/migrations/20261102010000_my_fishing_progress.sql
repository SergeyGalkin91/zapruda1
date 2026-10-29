-- SQL invoker: progress is computed from real user activity and cannot be forged
-- by submitting an XP number from a client.
create or replace function public.my_fishing_progress()
returns table (
  report_count bigint,
  catches_count bigint,
  photo_count bigint,
  photo_reports bigint,
  reactions_received bigint,
  trips_organized bigint,
  heaviest_catch_kg numeric
)
language sql stable security invoker set search_path = ''
as $$
  select
    (select count(*) from public.fishing_reports r where r.user_id = (select auth.uid())),
    (select count(*) from public.catches c where c.user_id = (select auth.uid())),
    (select count(*) from public.report_photos p where p.user_id = (select auth.uid())),
    (select count(distinct p.report_id) from public.report_photos p where p.user_id = (select auth.uid())),
    (select count(*) from public.reactions rx
       join public.fishing_reports r on r.id = rx.report_id
       where r.user_id = (select auth.uid())
         and rx.user_id <> r.user_id),
    (select count(*) from public.partner_trips t where t.organizer_id = (select auth.uid())),
    (select max(c.weight_kg) from public.catches c where c.user_id = (select auth.uid()));
$$;
revoke execute on function public.my_fishing_progress() from public, anon;
grant execute on function public.my_fishing_progress() to authenticated;
comment on function public.my_fishing_progress() is
  'Authorized user progress only. Community ranks reflect in-app activity, not verified professional fishing qualifications.';
