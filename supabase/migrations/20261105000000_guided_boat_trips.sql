-- ZAPRUDA / guided boat trips (paid outings with an organizer/guide).
-- Do not mistake self-reported safety claims for third-party verification.
-- No charges are collected here: bookings start as nonbinding applications.
alter table public.partner_trips
  add column if not exists trip_kind text not null default 'community',
  add column if not exists guide_service text not null default 'Поиск перспективных мест',
  add column if not exists boat_type text not null default '',
  add column if not exists sonar_model text not null default '',
  add column if not exists gear_included text not null default '',
  add column if not exists price_includes text not null default '',
  add column if not exists cancel_policy text not null default '',
  add column if not exists guide_experience_years smallint,
  add column if not exists safety_briefing boolean not null default false,
  add column if not exists life_jackets_available boolean not null default false,
  add column if not exists operator_eligibility_confirmed boolean not null default false;

alter table public.partner_trips
  drop constraint if exists partner_trips_trip_kind_check;
alter table public.partner_trips
  add constraint partner_trips_trip_kind_check
  check (trip_kind in ('community', 'guided'));

alter table public.partner_trips
  drop constraint if exists partner_trips_guided_fields_check;
alter table public.partner_trips
  add constraint partner_trips_guided_fields_check
  check (
    char_length(guide_service) <= 150
    and char_length(boat_type) <= 180
    and char_length(sonar_model) <= 180
    and char_length(gear_included) <= 500
    and char_length(price_includes) <= 650
    and char_length(cancel_policy) <= 500
    and (guide_experience_years is null or guide_experience_years between 0 and 60)
    and (
      trip_kind <> 'guided'
      or (
        finance_mode = 'fee'
        and contribution_rub > 0
        and char_length(btrim(boat_type)) >= 2
        and char_length(btrim(price_includes)) >= 5
        and char_length(btrim(cancel_policy)) >= 5
        and safety_briefing
        and life_jackets_available
        and operator_eligibility_confirmed
      )
    )
  );

create index if not exists partner_trips_kind_date_idx
  on public.partner_trips(trip_kind, status, departure_at);

comment on column public.partner_trips.operator_eligibility_confirmed
  is 'Self-attestation ONLY. Organizer confirms applicable boating qualifications/rights; NOT externally verified.';
comment on column public.partner_trips.life_jackets_available
  is 'Self-attested availability of personal flotation devices for all guests; NOT externally verified.';
comment on column public.partner_trips.guide_experience_years
  is 'Guide-supplied experience, not verified by ZAPRUDA.';
comment on column public.partner_trips.trip_kind
  is 'community = shared trip; guided = paid guided boat outing, payment arranged outside the platform.';
