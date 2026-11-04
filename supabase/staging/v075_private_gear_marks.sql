-- STAGING ONLY. Scoped profile dependencies; no copies of users or private GPS.
create table public.angler_gear(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 gear_type text not null check(gear_type in('rod','reel','line','lure','other')),
 brand text not null check(char_length(btrim(brand)) between 1 and 80),
 model text not null check(char_length(btrim(model)) between 1 and 150),
 variant text not null default '' check(char_length(variant)<=100),
 notes text not null default '' check(char_length(notes)<=500),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pilot_gear_owner_type on public.angler_gear(user_id,gear_type);
create table public.angler_gear_sets(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null default '' check(char_length(title)<=100),
 fishing_method text not null default '' check(char_length(fishing_method)<=80),
 rod_id uuid not null references public.angler_gear(id) on delete cascade,
 reel_id uuid not null references public.angler_gear(id) on delete cascade,
 line_id uuid references public.angler_gear(id) on delete set null,
 notes text not null default '' check(char_length(notes)<=500),
 is_primary boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(rod_id<>reel_id and(line_id is null or(line_id<>rod_id and line_id<>reel_id)))
);
create unique index pilot_gear_one_primary on public.angler_gear_sets(user_id) where is_primary;
create index pilot_kit_owner on public.angler_gear_sets(user_id,created_at);
create index pilot_kit_rod on public.angler_gear_sets(rod_id);
create index pilot_kit_reel on public.angler_gear_sets(reel_id);
create index pilot_kit_line on public.angler_gear_sets(line_id) where line_id is not null;
create table public.private_fishing_marks(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('promising','snag','dropoff','hole','riffle','other')),
 title text not null check(char_length(btrim(title)) between 2 and 80),
 note text not null default '' check(char_length(note)<=700),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 created_at timestamptz not null default now()
);
create index pilot_private_mark_owner on public.private_fishing_marks(user_id,created_at desc);
alter table public.angler_gear enable row level security;
alter table public.angler_gear_sets enable row level security;
alter table public.private_fishing_marks enable row level security;
revoke all on public.angler_gear,public.angler_gear_sets,public.private_fishing_marks from public,anon,authenticated;
grant select,delete on public.angler_gear,public.angler_gear_sets,public.private_fishing_marks to authenticated;
grant insert(user_id,gear_type,brand,model,variant,notes) on public.angler_gear to authenticated;
-- Identity/type cannot change after gear has been referenced by a kit.
grant update(brand,model,variant,notes) on public.angler_gear to authenticated;
grant insert(user_id,title,fishing_method,rod_id,reel_id,line_id,notes) on public.angler_gear_sets to authenticated;
grant update(title,fishing_method,rod_id,reel_id,line_id,notes) on public.angler_gear_sets to authenticated;
grant insert(user_id,kind,title,note,latitude,longitude) on public.private_fishing_marks to authenticated;
grant all on public.angler_gear,public.angler_gear_sets,public.private_fishing_marks to service_role;
create policy gear_own on public.angler_gear for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid())
 and(select zapruda_internal.pilot_confirmed_actor_v075()));
create policy marks_own on public.private_fishing_marks for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid())
 and(select zapruda_internal.pilot_confirmed_actor_v075()));
create policy kits_own on public.angler_gear_sets for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid())
 and(select zapruda_internal.pilot_confirmed_actor_v075())
 and exists(select 1 from public.angler_gear r where r.id=rod_id and r.user_id=(select auth.uid()) and r.gear_type='rod')
 and exists(select 1 from public.angler_gear r where r.id=reel_id and r.user_id=(select auth.uid()) and r.gear_type='reel')
 and(line_id is null or exists(select 1 from public.angler_gear r where r.id=line_id and r.user_id=(select auth.uid()) and r.gear_type='line')));
create function public.set_my_primary_gear_set(p_kit_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not zapruda_internal.pilot_confirmed_actor_v075() then
 raise exception 'Confirmed account required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('kit:'||actor::text,75));
 if not exists(select 1 from public.angler_gear_sets where id=p_kit_id and user_id=actor)then
 raise exception 'Kit unavailable' using errcode='42501'; end if;
 update public.angler_gear_sets set is_primary=false,updated_at=now() where user_id=actor and is_primary;
 update public.angler_gear_sets set is_primary=true,updated_at=now() where id=p_kit_id and user_id=actor;
end$$;
revoke all on function public.set_my_primary_gear_set(uuid) from public,anon;
grant execute on function public.set_my_primary_gear_set(uuid) to authenticated;
comment on table public.private_fishing_marks is 'Private owner-only coordinates. Excluded from feed/chat/SSR and AI requests.';
