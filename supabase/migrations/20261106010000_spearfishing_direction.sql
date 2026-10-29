-- ZAPRUDA: separate spearfishing direction and optional public safety-aware profile.
-- Spearfishing is not treated as a spinning subcategory.
alter table public.fishing_reports drop constraint if exists fishing_reports_fishing_method_check;
alter table public.fishing_reports add constraint fishing_reports_fishing_method_check
 check (fishing_method is null or fishing_method in (
 'Спиннинг','Фидер','Поплавок','Нахлыст','Зимняя рыбалка',
 'Карпфишинг','Донная ловля','Другое','Подводная охота'
 ));
alter table public.angler_preferences drop constraint if exists angler_preferences_main_technique_check;
alter table public.angler_preferences add constraint angler_preferences_main_technique_check
 check (main_technique in (
 'Спиннинг','Фидер','Поплавок','Нахлыст','Зимняя рыбалка',
 'Карпфишинг','Донная ловля','Другое','Подводная охота'
 ));

create table if not exists public.spearfishing_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 home_city text not null default '' check (char_length(home_city) <= 100),
 preferred_waters text not null default '' check (char_length(preferred_waters) <= 600),
 experience_years smallint check (experience_years between 0 and 60),
 activity_style text not null default 'Пресноводная'
   check (activity_style in ('Пресноводная','Морская','Оба варианта')),
 access_type text not null default 'С берега'
   check (access_type in ('С берега','С лодки','Оба варианта')),
 equipment_overview text not null default '' check (char_length(equipment_overview) <= 650),
 buddy_notes text not null default '' check (char_length(buddy_notes) <= 500),
 safety_training_self_reported boolean not null default false,
 buddy_only boolean not null default true check (buddy_only),
 publicly_listed boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.spearfishing_profiles enable row level security;
drop policy if exists "Read published spearfishing profiles or own" on public.spearfishing_profiles;
create policy "Read published spearfishing profiles or own"
 on public.spearfishing_profiles for select to anon,authenticated
 using (publicly_listed or user_id = (select auth.uid()));
drop policy if exists "Create own spearfishing profile" on public.spearfishing_profiles;
create policy "Create own spearfishing profile"
 on public.spearfishing_profiles for insert to authenticated
 with check (user_id = (select auth.uid()));
drop policy if exists "Update own spearfishing profile" on public.spearfishing_profiles;
create policy "Update own spearfishing profile"
 on public.spearfishing_profiles for update to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));
revoke all on public.spearfishing_profiles from anon,authenticated;
grant select on public.spearfishing_profiles to anon;
grant select,insert,update on public.spearfishing_profiles to authenticated;

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
           ('Карпфишинг'::text), ('Донная ловля'::text), ('Другое'::text), ('Подводная охота'::text)
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

