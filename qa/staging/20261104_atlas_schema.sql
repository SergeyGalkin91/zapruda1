-- ZAPRUDA STAGING-only Atlas schema, target yudtbifopfnjtjanaqrd.
-- Catalog deliberately empty: do NOT duplicate any production/user data.
-- Not placed in production auto-migrations.
create table public.atlas_fish_species(
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[a-z0-9-]+$'),
 name text not null unique check(length(name) between 2 and 90),
 description text not null default '' check(length(description)<=800)
);
create table public.atlas_waterbodies(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9-]{3,100}$'),
 country_code char(2) not null check(country_code in ('RU','BY','KZ','AM','AZ','KG','MD','TJ','UZ','TM')),
 name text not null check(length(trim(name)) between 3 and 120),
 region text not null default '',
 kind text not null check(kind in ('river','lake','reservoir','canal','other')),
 summary text not null default '' check(length(summary)<=750),
 source_note text not null default 'Предварительный каталог. Наличие видов рыб требует регионального подтверждения.',
 is_published boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.atlas_waterbody_species(
 waterbody_id uuid not null references public.atlas_waterbodies(id) on delete cascade,
 species_id uuid not null references public.atlas_fish_species(id) on delete cascade,
 evidence_status text not null default 'indicative' check(evidence_status in ('indicative','reviewed')),
 note text not null default '' check(length(note)<=400),
 primary key(waterbody_id,species_id)
);
create index atlas_waterbody_species_species_idx on public.atlas_waterbody_species(species_id);

create table public.atlas_catch_claims(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 waterbody_id uuid not null references public.atlas_waterbodies(id),
 species_id uuid not null references public.atlas_fish_species(id),
 catch_id uuid not null unique references public.catches(id) on delete cascade,
 evidence_photo_id uuid not null references public.report_photos(id) on delete restrict,
 status text not null default 'pending' check(status in ('pending','verified','rejected')),
 reviewer_note text not null default '',
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 unique(user_id,waterbody_id,species_id)
);
create index atlas_claims_user_idx on public.atlas_catch_claims(user_id,created_at desc);

alter table public.atlas_fish_species enable row level security;
alter table public.atlas_waterbodies enable row level security;
alter table public.atlas_waterbody_species enable row level security;
alter table public.atlas_catch_claims enable row level security;
revoke all on public.atlas_fish_species,public.atlas_waterbodies,public.atlas_waterbody_species,public.atlas_catch_claims from PUBLIC,anon,authenticated;
grant select on public.atlas_fish_species to anon,authenticated;
grant select on public.atlas_waterbodies to anon,authenticated;
grant select on public.atlas_waterbody_species to anon,authenticated;
-- Do not expose moderator review notes/claim evidence fields in public APIs.
grant select (id,user_id,waterbody_id,species_id,catch_id,status,created_at)
 on public.atlas_catch_claims to authenticated;
grant insert(user_id,waterbody_id,species_id,catch_id,evidence_photo_id)
 on public.atlas_catch_claims to authenticated;

create policy staging_atlas_fish_read on public.atlas_fish_species
 for select to anon,authenticated using(true);
create policy staging_atlas_waterbodies_public on public.atlas_waterbodies
 for select to anon,authenticated using(is_published);
create policy staging_atlas_waterbody_species_public on public.atlas_waterbody_species
 for select to anon,authenticated using(exists(
   select 1 from public.atlas_waterbodies w
   where w.id=atlas_waterbody_species.waterbody_id and w.is_published
 ));
create policy staging_atlas_claims_owner_read on public.atlas_catch_claims
 for select to authenticated using(user_id=(select auth.uid()));
create policy staging_atlas_claims_valid_insert on public.atlas_catch_claims
 for insert to authenticated with check(
  user_id=(select auth.uid())
  and status='pending' and reviewer_note='' and reviewed_at is null
  and exists(select 1 from public.atlas_waterbody_species ws
       where ws.waterbody_id=atlas_catch_claims.waterbody_id
       and ws.species_id=atlas_catch_claims.species_id)
  and exists(
    select 1 from public.catches c
    join public.fishing_reports r on r.id=c.report_id and r.user_id=c.user_id
    join public.atlas_fish_species f on f.id=atlas_catch_claims.species_id
    join public.report_photos p on p.report_id=r.id and p.user_id=c.user_id
    where c.id=atlas_catch_claims.catch_id and c.user_id=(select auth.uid())
      and p.id=atlas_catch_claims.evidence_photo_id
      and lower(trim(c.species))=lower(trim(f.name))
  )
 );
-- No API writes to catalog and no claim UPDATE/DELETE; moderation separately gated.
