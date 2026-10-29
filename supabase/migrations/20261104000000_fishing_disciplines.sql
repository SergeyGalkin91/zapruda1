-- ZAPRUDA: independent, opt-in fishing disciplines for achievement tracking.
-- Historic reports remain unassigned instead of falsely attributing them
-- to spinning or to the user's current preferred fishing method.

alter table public.fishing_reports
  add column if not exists fishing_method text;

alter table public.fishing_reports
  drop constraint if exists fishing_reports_fishing_method_check;
alter table public.fishing_reports
  add constraint fishing_reports_fishing_method_check
  check (
    fishing_method is null or fishing_method in (
      'Спиннинг', 'Фидер', 'Поплавок', 'Нахлыст',
      'Зимняя рыбалка', 'Карпфишинг', 'Донная ловля', 'Другое'
    )
  );

alter table public.angler_preferences
  drop constraint if exists angler_preferences_main_technique_check;
alter table public.angler_preferences
  add constraint angler_preferences_main_technique_check
  check (
    main_technique in (
      'Спиннинг', 'Фидер', 'Поплавок', 'Нахлыст',
      'Зимняя рыбалка', 'Карпфишинг', 'Донная ловля', 'Другое'
    )
  );

create index if not exists fishing_reports_angler_method_idx
  on public.fishing_reports(user_id, fishing_method, created_at desc);

-- Each discipline earns XP independently. For XP, at most three catches
-- in one report count towards the discipline to reduce trivial farming;
-- historical records without fishing_method don't earn specialized XP.
create or replace function public.my_fishing_specializations()
returns table (
  fishing_method text,
  report_count bigint,
  catches_count bigint,
  credited_catches bigint,
  photo_reports bigint,
  distinct_waters bigint,
  heaviest_catch_kg numeric
)
language sql stable security invoker set search_path = ''
as $$
  with methods(fishing_method) as (
    values ('Спиннинг'::text), ('Фидер'::text), ('Поплавок'::text),
           ('Нахлыст'::text), ('Зимняя рыбалка'::text),
           ('Карпфишинг'::text), ('Донная ловля'::text), ('Другое'::text)
  ),
  owned_reports as (
    select r.id, r.fishing_method, r.location_name
    from public.fishing_reports r
    where r.user_id = (select auth.uid()) and r.fishing_method is not null
  ),
  ranked_catches as (
    select c.report_id, c.weight_kg,
           row_number() over (partition by c.report_id order by c.created_at, c.id) as rn
    from public.catches c
    where c.user_id = (select auth.uid())
  ),
  report_stats as (
    select r.fishing_method, count(*) as report_count,
           count(distinct nullif(lower(btrim(r.location_name)), '')) as distinct_waters,
           count(*) filter (
             where exists (
               select 1 from public.report_photos p
               where p.report_id = r.id and p.user_id = (select auth.uid())
             )
           ) as photo_reports
    from owned_reports r
    group by r.fishing_method
  ),
  catch_stats as (
    select r.fishing_method,
           count(*) as catches_count,
           count(*) filter (where c.rn <= 3) as credited_catches,
           max(c.weight_kg) as heaviest_catch_kg
    from owned_reports r
    join ranked_catches c on c.report_id = r.id
    group by r.fishing_method
  )
  select m.fishing_method,
         coalesce(rs.report_count,0)::bigint,
         coalesce(cs.catches_count,0)::bigint,
         coalesce(cs.credited_catches,0)::bigint,
         coalesce(rs.photo_reports,0)::bigint,
         coalesce(rs.distinct_waters,0)::bigint,
         cs.heaviest_catch_kg
  from methods m
  left join report_stats rs using (fishing_method)
  left join catch_stats cs using (fishing_method);
$$;
revoke execute on function public.my_fishing_specializations() from public, anon;
grant execute on function public.my_fishing_specializations() to authenticated;
comment on function public.my_fishing_specializations() is
  'Returns activity-based metrics for each fishing method of the current signed-in user only. Not sporting credentials.';
