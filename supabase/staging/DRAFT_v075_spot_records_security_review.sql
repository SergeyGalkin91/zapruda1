
-- ZAPRUDA v0.7.5 SPOT | STAGING ONLY
-- New isolated tables; does not modify existing team competitions, reports or user permissions.
create schema if not exists zc_spot_internal;
revoke all on schema zc_spot_internal from public, anon, authenticated;
grant usage on schema zc_spot_internal to service_role;

create table if not exists public.zc_public_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  city text not null,
  region text not null,
  waterbody_name text not null,
  public_lat double precision,
  public_lng double precision,
  disciplines text[] not null default array[]::text[],
  state text not null default 'candidate' check (state in ('candidate','approved','retired')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint public_pair check ((public_lat is null) = (public_lng is null)),
  constraint public_lat_range check (public_lat is null or public_lat between -90 and 90),
  constraint public_lng_range check (public_lng is null or public_lng between -180 and 180),
  constraint only_reviewed_published check (state <> 'approved' or reviewed_at is not null)
);
alter table public.zc_public_spots enable row level security;
revoke all on public.zc_public_spots from public, anon, authenticated;
grant select on public.zc_public_spots to anon, authenticated;
drop policy if exists zc_spots_public_approved on public.zc_public_spots;
create policy zc_spots_public_approved on public.zc_public_spots for select
  to anon, authenticated using (state = 'approved' and reviewed_at is not null);
create index if not exists zc_public_spots_lookup on public.zc_public_spots(state,city);

create table if not exists zc_spot_internal.catches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  league text not null check (league in ('street','ultralight','carpfishing','winter','boat')),
  method text not null,
  species_id text not null check (length(trim(species_id)) > 0),
  weight_g integer check(weight_g > 0),
  length_mm integer check(length_mm > 0),
  captured_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','verified','rejected','revoked')),
  lawful boolean not null default false,
  ul_gear_approved boolean not null default false,
  micro_welfare_approved boolean not null default false,
  season_id text,
  created_at timestamptz not null default now()
);
create table if not exists zc_spot_internal.evidence (
  id uuid primary key default gen_random_uuid(),
  catch_id uuid not null references zc_spot_internal.catches(id) on delete restrict,
  private_storage_key text not null check(length(trim(private_storage_key)) > 0),
  evidence_kind text not null check(evidence_kind in ('photo','video','scale','ruler','tackle')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists zc_spot_internal.capture_scopes (
  catch_id uuid not null references zc_spot_internal.catches(id) on delete restrict,
  scope_type text not null check(scope_type in ('spot','waterbody','municipality','region','country')),
  scope_id text not null check(length(trim(scope_id)) > 0),
  approved boolean not null default false,
  primary key(catch_id,scope_type,scope_id)
);
create table if not exists zc_spot_internal.categories (
  id uuid primary key default gen_random_uuid(),
  league text not null check(league in ('street','ultralight','carpfishing','winter','boat')),
  nomination text not null check(nomination in
    ('spot-big-fish','spot-longest','ul-big-fish','ul-smallest',
     'carp-big-fish','ice-big-fish','boat-big-fish')),
  method text not null,
  scope_type text not null check(scope_type in ('spot','waterbody','municipality','region','country')),
  scope_id text not null check(length(trim(scope_id)) > 0),
  species_id text,
  season_id text,
  category_key text not null unique,
  created_at timestamptz not null default now(),
  constraint category_valid check (
    (league='street' and nomination in ('spot-big-fish','spot-longest') and scope_type='spot'
     and method in ('shore-spinning','feeder','float','bottom'))
    or (league='ultralight' and nomination in ('ul-big-fish','ul-smallest') and scope_type='spot'
        and method='ultralight')
    or (league='carpfishing' and nomination='carp-big-fish' and scope_type='waterbody'
        and method='carpfishing' and species_id is not null)
    or (league='winter' and nomination='ice-big-fish' and scope_type='region'
        and method in ('ice-lure','ice-mormyshka','ice-float','ice-tipup')
        and species_id is not null and season_id is not null)
    or (league='boat' and nomination='boat-big-fish'
        and scope_type in ('waterbody','municipality','region','country')
        and method in ('boat-spinning','boat-vertical','boat-trolling')
        and species_id is not null)
  ),
  constraint category_key_consistent check (
    category_key = jsonb_build_array(league,nomination,method,scope_type,scope_id,species_id,season_id)::text
  )
);
create table if not exists zc_spot_internal.title_holders (
  category_id uuid primary key references zc_spot_internal.categories(id) on delete restrict,
  catch_id uuid not null references zc_spot_internal.catches(id) on delete restrict,
  score integer not null check(score > 0),
  updated_at timestamptz not null default now()
);
create table if not exists zc_spot_internal.title_history (
  id bigint generated always as identity primary key,
  category_id uuid not null references zc_spot_internal.categories(id),
  old_catch_id uuid references zc_spot_internal.catches(id),
  new_catch_id uuid not null references zc_spot_internal.catches(id),
  new_score integer not null check(new_score > 0),
  changed_at timestamptz not null default now()
);
create table if not exists zc_spot_internal.moderation_events (
  id bigint generated always as identity primary key,
  catch_id uuid not null references zc_spot_internal.catches(id),
  reviewer_id uuid not null references auth.users(id),
  decision text not null check(decision in ('verified','rejected','revoked')),
  decided_at timestamptz not null default now()
);
create table if not exists zc_spot_internal.notification_outbox (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  category_id uuid not null references zc_spot_internal.categories(id),
  catch_id uuid not null references zc_spot_internal.catches(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists zc_catches_owner on zc_spot_internal.catches(owner_id,created_at desc);
create index if not exists zc_evidence_catch on zc_spot_internal.evidence(catch_id);
create index if not exists zc_title_history_category on zc_spot_internal.title_history(category_id,changed_at desc);

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'catches','evidence','capture_scopes','categories','title_holders',
    'title_history','moderation_events','notification_outbox'
  ] loop
    execute format('alter table zc_spot_internal.%I enable row level security',tbl);
    execute format('revoke all on zc_spot_internal.%I from public, anon, authenticated',tbl);
    execute format('grant select, insert, update, delete on zc_spot_internal.%I to service_role',tbl);
  end loop;
end $$;
grant usage, select on all sequences in schema zc_spot_internal to service_role;

-- Service-only moderator; calling application MUST separately authenticate/authorize actual reviewer.
-- No client user can approve a catch via Data API.
create or replace function zc_spot_internal.moderate_catch(
 p_catch_id uuid, p_reviewer_id uuid, p_decision text
) returns boolean language plpgsql security invoker set search_path = pg_catalog, zc_spot_internal as $$
declare c zc_spot_internal.catches%rowtype;
begin
  if p_decision not in ('verified','rejected') then raise exception 'Invalid decision'; end if;
  if not exists(select 1 from auth.users where id=p_reviewer_id) then raise exception 'Unknown reviewer'; end if;
  select * into c from zc_spot_internal.catches where id=p_catch_id for update;
  if not found or c.status <> 'pending' then raise exception 'Catch not pending'; end if;
  if p_decision='verified' then
    if not c.lawful
     or not exists(select 1 from zc_spot_internal.evidence where catch_id=p_catch_id and approved)
     or not exists(select 1 from zc_spot_internal.capture_scopes where catch_id=p_catch_id and approved)
    then raise exception 'Missing lawful, proof or territory verification'; end if;
  end if;
  update zc_spot_internal.catches set status=p_decision where id=p_catch_id;
  insert into zc_spot_internal.moderation_events(catch_id,reviewer_id,decision)
     values(p_catch_id,p_reviewer_id,p_decision);
  return true;
end $$;
revoke all on function zc_spot_internal.moderate_catch(uuid,uuid,text) from public, anon, authenticated;
grant execute on function zc_spot_internal.moderate_catch(uuid,uuid,text) to service_role;

-- Atomic current-holder election, with transaction-scoped serialization for the first crown.
-- Return true only after an actual first crown or improved record.
create or replace function zc_spot_internal.award_verified_catch(
 p_catch_id uuid, p_category_id uuid
) returns boolean language plpgsql security invoker set search_path = pg_catalog, zc_spot_internal as $$
declare c zc_spot_internal.catches%rowtype;
        cat zc_spot_internal.categories%rowtype;
        old_id uuid; old_score int; new_score int; improve boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_category_id::text, 101));
  select * into c from zc_spot_internal.catches where id=p_catch_id;
  select * into cat from zc_spot_internal.categories where id=p_category_id;
  if c.id is null or cat.id is null then raise exception 'Unknown catch or category'; end if;
  if c.status<>'verified' or not c.lawful
    or c.league<>cat.league or c.method<>cat.method
    or (cat.species_id is not null and cat.species_id<>c.species_id)
    or (cat.season_id is not null and cat.season_id is distinct from c.season_id)
    or (cat.league='ultralight' and not c.ul_gear_approved)
    or (cat.nomination='ul-smallest' and not c.micro_welfare_approved)
    or not exists(select 1 from zc_spot_internal.evidence where catch_id=c.id and approved)
    or not exists(select 1 from zc_spot_internal.capture_scopes where catch_id=c.id
      and scope_type=cat.scope_type and scope_id=cat.scope_id and approved)
  then raise exception 'Catch ineligible for category'; end if;
  if cat.nomination in ('spot-longest','ul-smallest') then new_score:=c.length_mm;
  else new_score:=c.weight_g; end if;
  if new_score is null or new_score<=0 then raise exception 'Missing verified measurement'; end if;
  select catch_id,score into old_id,old_score from zc_spot_internal.title_holders
    where category_id=p_category_id for update;
  if old_id=p_catch_id then return false; end if;
  improve:=old_id is null or
     (case when cat.nomination='ul-smallest' then new_score < old_score
           else new_score > old_score end);
  if not improve then return false; end if;
  insert into zc_spot_internal.title_holders(category_id,catch_id,score,updated_at)
    values(p_category_id,p_catch_id,new_score,now())
    on conflict(category_id) do update set catch_id=excluded.catch_id,
        score=excluded.score,updated_at=excluded.updated_at;
  insert into zc_spot_internal.title_history(category_id,old_catch_id,new_catch_id,new_score)
    values(p_category_id,old_id,p_catch_id,new_score);
  insert into zc_spot_internal.notification_outbox(event_key,category_id,catch_id)
    values(jsonb_build_array('title_changed',p_category_id,p_catch_id)::text,p_category_id,p_catch_id)
    on conflict(event_key) do nothing;
  return true;
end $$;
revoke all on function zc_spot_internal.award_verified_catch(uuid,uuid) from public, anon, authenticated;
grant execute on function zc_spot_internal.award_verified_catch(uuid,uuid) to service_role;
