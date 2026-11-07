-- STAGING ONLY: yudtbifopfnjtjanaqrd. Requires the two already-applied
-- staging_minimal_report_* deltas. Do not replay those or run this on production.
-- No data, roles, public catches, or user identities are provisioned.
create function zapruda_internal.pilot_confirmed_actor_v075() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=(select auth.uid())
   and u.email_confirmed_at is not null and u.is_anonymous is false)
$$;
revoke all on function zapruda_internal.pilot_confirmed_actor_v075() from public,anon;
grant usage on schema zapruda_internal to authenticated;
grant execute on function zapruda_internal.pilot_confirmed_actor_v075() to authenticated;

alter table public.fishing_reports add constraint pilot_report_owner_key unique(id,user_id);
alter table public.catches add constraint pilot_catch_report_owner_fk
 foreign key(report_id,user_id) references public.fishing_reports(id,user_id) on delete cascade;
alter table public.catches add constraint pilot_catch_values check(
 char_length(btrim(species)) between 1 and 120
 and (weight_kg is null or weight_kg>0 and weight_kg<=1000)
 and (length_cm is null or length_cm>0 and length_cm<=600)
 and (technique is null or char_length(technique)<=500)
 and (lure is null or char_length(lure)<=500) and photo_url is null);
alter table public.comments add constraint pilot_comment_size check(char_length(body)<=2000);
create index pilot_catch_owner_idx on public.catches(user_id);
create index pilot_comment_owner_idx on public.comments(user_id);

create policy pilot_confirmed_report_insert on public.fishing_reports
 as restrictive for insert to authenticated
 with check((select zapruda_internal.pilot_confirmed_actor_v075()));
create policy pilot_confirmed_catch_insert on public.catches
 as restrictive for insert to authenticated
 with check((select zapruda_internal.pilot_confirmed_actor_v075()));
create policy pilot_confirmed_comment_insert on public.comments
 as restrictive for insert to authenticated
 with check((select zapruda_internal.pilot_confirmed_actor_v075()));

-- Private request journal: never part of a public REST/SSR response. Invoker RPC
-- keeps existing report/catch RLS and exact-coordinate column ACL in force.
create table zapruda_internal.pilot_report_publications_v075(
 report_id uuid primary key references public.fishing_reports(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 payload jsonb not null
);
alter table zapruda_internal.pilot_report_publications_v075 enable row level security;
revoke all on zapruda_internal.pilot_report_publications_v075 from public,anon,authenticated;
grant select,insert on zapruda_internal.pilot_report_publications_v075 to authenticated;
create policy own_request_read on zapruda_internal.pilot_report_publications_v075
 for select to authenticated using(user_id=(select auth.uid()));
create policy own_request_insert on zapruda_internal.pilot_report_publications_v075
 for insert to authenticated with check(user_id=(select auth.uid()) and exists(
 select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())));

create function public.publish_report_with_catches(p_report_id uuid,p_report jsonb,p_catches jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); previous jsonb;
 payload jsonb:=jsonb_build_object('report',p_report,'catches',p_catches);
begin
 if actor is null or not zapruda_internal.pilot_confirmed_actor_v075() then
  raise exception 'Confirmed account required' using errcode='42501';
 end if;
 if p_report_id is null or jsonb_typeof(p_report) is distinct from 'object'
 or jsonb_typeof(p_catches) is distinct from 'array' then
  raise exception 'Invalid report' using errcode='22023';
 end if;
 if jsonb_array_length(p_catches) not between 1 and 20
 or exists(select 1 from jsonb_object_keys(p_report) k where k not in
 ('title','body','location_name','weather_summary','air_temperature_c','pressure_hpa',
 'wind_direction','wind_speed_ms','is_public','fishing_method'))
 or char_length(coalesce(p_report->>'title','')) not between 1 and 160
 or char_length(coalesce(p_report->>'body',''))>30000
 or char_length(coalesce(p_report->>'location_name',''))>200
 or char_length(coalesce(p_report->>'weather_summary',''))>1000
 or char_length(coalesce(p_report->>'fishing_method',''))>80
 then raise exception 'Invalid report' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_catches) c where jsonb_typeof(c)<>'object') then
  raise exception 'Invalid catch' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_catches) c,
 lateral jsonb_object_keys(c) k where k not in('species','weight_kg','length_cm','technique','lure')) then
  raise exception 'Invalid catch' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('report:'||actor::text||':'||p_report_id::text,75));
 select j.payload into previous from zapruda_internal.pilot_report_publications_v075 j
 where j.report_id=p_report_id and j.user_id=actor;
 if found then
  if previous<>payload then raise exception 'Request changed' using errcode='22023'; end if;
  return p_report_id;
 end if;
 insert into public.fishing_reports(id,user_id,title,body,location_name,weather_summary,
 air_temperature_c,pressure_hpa,wind_direction,wind_speed_ms,is_public,fishing_method)
 values(p_report_id,actor,p_report->>'title',p_report->>'body',p_report->>'location_name',
 p_report->>'weather_summary',(p_report->>'air_temperature_c')::numeric,
 (p_report->>'pressure_hpa')::numeric,p_report->>'wind_direction',
 (p_report->>'wind_speed_ms')::numeric,coalesce((p_report->>'is_public')::boolean,false),
 p_report->>'fishing_method');
 insert into public.catches(report_id,user_id,species,weight_kg,length_cm,technique,lure)
 select p_report_id,actor,c->>'species',(c->>'weight_kg')::numeric,(c->>'length_cm')::numeric,
 c->>'technique',c->>'lure' from jsonb_array_elements(p_catches) c;
 insert into zapruda_internal.pilot_report_publications_v075 values(p_report_id,actor,payload);
 return p_report_id;
 -- No exception handler: any catch/constraint/RLS failure rolls back the report too.
end $$;
revoke all on function public.publish_report_with_catches(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.publish_report_with_catches(uuid,jsonb,jsonb) to authenticated;
