-- STAGING ONLY. Missing profile aggregates, reviewed invoker bodies; no imported data or permissions.
create table public.user_activity_windows(
 user_id uuid not null references public.profiles(id) on delete cascade,
 window_at timestamptz not null default date_bin(interval '5 minutes',now(),timestamptz '2000-01-01 00:00:00+00'),
 primary key(user_id,window_at)
);
create table public.beta_test_applications(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','approved','declined')),
 created_at timestamptz not null default now(),reviewed_at timestamptz
);
alter table public.user_activity_windows enable row level security;
alter table public.beta_test_applications enable row level security;
revoke all on public.user_activity_windows,public.beta_test_applications from public,anon,authenticated;
grant select on public.user_activity_windows,public.beta_test_applications to authenticated;
-- The server supplies time/status. Clients cannot backdate, award badges or approve themselves.
grant insert(user_id) on public.user_activity_windows,public.beta_test_applications to authenticated;
grant all on public.user_activity_windows,public.beta_test_applications to service_role;
create policy activity_own_read on public.user_activity_windows for select to authenticated using(user_id=(select auth.uid()));
create policy activity_own_insert on public.user_activity_windows for insert to authenticated
 with check(user_id=(select auth.uid()) and(select zapruda_internal.pilot_confirmed_actor_v075()));
create view public.my_activity_badges with(security_invoker=true,security_barrier=true) as
 select p.id as user_id,count(w.window_at)::integer as active_windows,
 (count(w.window_at)*5)::integer as credited_minutes,
 count(distinct(w.window_at at time zone 'UTC')::date)::integer as active_days,
 count(w.window_at)>=12 as earned_first_hour,
 count(distinct(w.window_at at time zone 'UTC')::date)>=7 as earned_week,
 count(w.window_at)>=120 as earned_ten_hours,
 count(distinct(w.window_at at time zone 'UTC')::date)>=30 and count(w.window_at)>=120 as beta_eligible
 from public.profiles p left join public.user_activity_windows w on w.user_id=p.id
 where p.id=(select auth.uid()) group by p.id;
revoke all on public.my_activity_badges from public,anon,authenticated;
grant select on public.my_activity_badges to authenticated;
create policy beta_own_read on public.beta_test_applications for select to authenticated using(user_id=(select auth.uid()));
create policy beta_eligible_insert on public.beta_test_applications for insert to authenticated
 with check(user_id=(select auth.uid()) and(select zapruda_internal.pilot_confirmed_actor_v075())
 and status='pending' and exists(select 1 from public.my_activity_badges b where b.beta_eligible));
CREATE FUNCTION public.my_fishing_progress()
 RETURNS TABLE(report_count bigint, catches_count bigint, photo_count bigint, photo_reports bigint, reactions_received bigint, trips_organized bigint, heaviest_catch_kg numeric)
 LANGUAGE sql
 SECURITY INVOKER
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;
revoke all on function public.my_fishing_progress() from public,anon;
grant execute on function public.my_fishing_progress() to authenticated;
CREATE FUNCTION public.my_fishing_specializations_v2()
 RETURNS TABLE(fishing_method text, report_count bigint, credited_reports bigint, catches_count bigint, credited_catches bigint, photo_reports bigint, credited_photo_reports bigint, distinct_waters bigint, active_days bigint, distinct_species bigint, heaviest_catch_kg numeric)
 LANGUAGE sql
 SECURITY INVOKER
 STABLE
 SET search_path TO ''
AS $function$
  with methods(fishing_method) as (
    values ('Спиннинг'::text),('Фидер'),('Поплавок'),('Нахлыст'),('Зимняя рыбалка'),
    ('Карпфишинг'),('Донная ловля'),('Подводная охота'),('Троллинг'),
    ('Морская рыбалка'),('Матчевая ловля'),('Болонская ловля'),('Тенкара'),
    ('Жерлицы'),('Другое')
  ),
  own_reports as (
    select r.id, r.fishing_method, r.created_at,
           nullif(lower(btrim(r.location_name)),'') as water,
           (r.created_at at time zone 'UTC')::date as calendar_day,
           exists(
             select 1 from public.report_photos p
             where p.report_id=r.id and p.user_id=(select auth.uid())
           ) as has_photo,
           row_number() over (
             partition by r.fishing_method, (r.created_at at time zone 'UTC')::date
             order by r.created_at,r.id
           ) as in_day_position
    from public.fishing_reports r
    where r.user_id=(select auth.uid()) and r.fishing_method is not null
  ),
  report_stats as (
    select r.fishing_method,
           count(*)::bigint as total_reports,
           count(*) filter (where r.in_day_position<=2)::bigint as qualifying_reports,
           count(*) filter (where r.has_photo)::bigint as total_photo_reports,
           count(*) filter (where r.has_photo and r.in_day_position<=2)::bigint as qualifying_photo_reports,
           count(distinct r.water) filter (where r.in_day_position<=2 and r.has_photo and length(r.water)>=3)::bigint as waters_count,
           count(distinct r.calendar_day) filter (where r.in_day_position<=2)::bigint as days_count
    from own_reports r
    group by r.fishing_method
  ),
  catches_ranked as (
    select r.fishing_method, r.in_day_position, r.has_photo, c.species, c.weight_kg,
           row_number() over(partition by r.id order by c.created_at,c.id) as catch_in_report
    from own_reports r join public.catches c
      on c.report_id=r.id and c.user_id=(select auth.uid())
  ),
  catch_stats as (
    select c.fishing_method,
           count(*)::bigint as total_catches,
           count(*) filter(
             where c.in_day_position<=2 and c.has_photo and c.catch_in_report<=3
             and length(btrim(c.species))>=2
           )::bigint as qualifying_catches,
           count(distinct lower(btrim(c.species))) filter (
             where c.in_day_position<=2 and c.has_photo and c.catch_in_report<=3
             and length(btrim(c.species))>=2
           )::bigint as fish_variety,
           max(c.weight_kg) as maximum_weight
    from catches_ranked c
    group by c.fishing_method
  )
  select m.fishing_method,
         coalesce(rs.total_reports,0),
         coalesce(rs.qualifying_reports,0),
         coalesce(cs.total_catches,0),
         coalesce(cs.qualifying_catches,0),
         coalesce(rs.total_photo_reports,0),
         coalesce(rs.qualifying_photo_reports,0),
         coalesce(rs.waters_count,0),
         coalesce(rs.days_count,0),
         coalesce(cs.fish_variety,0),
         cs.maximum_weight
  from methods m
  left join report_stats rs using(fishing_method)
  left join catch_stats cs using(fishing_method);
$function$
;
revoke all on function public.my_fishing_specializations_v2() from public,anon;
grant execute on function public.my_fishing_specializations_v2() to authenticated;
