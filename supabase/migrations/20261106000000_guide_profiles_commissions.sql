-- ZAPRUDA: dedicated fishing-guide accounts, fixed-price guided trips and
-- pending booking quotes. No in-app payment collection is enabled.
-- These fields are publicly declared by guides; they do NOT certify credentials.

create table if not exists public.guide_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 100),
  home_city text not null default '' check (char_length(home_city) <= 100),
  about text not null default '' check (char_length(about) <= 1500),
  specialties text not null default '' check (char_length(specialties) <= 400),
  experience_years smallint check (experience_years between 0 and 60),
  boat_model text not null default '' check (char_length(boat_model) <= 180),
  boat_capacity smallint check (boat_capacity between 1 and 12),
  sonar_model text not null default '' check (char_length(sonar_model) <= 180),
  included_gear text not null default '' check (char_length(included_gear) <= 500),
  service_program text not null default '' check (char_length(service_program) <= 700),
  cancellation_terms text not null default '' check (char_length(cancellation_terms) <= 500),
  offers_safety_briefing boolean not null default false,
  offers_life_jackets boolean not null default false,
  eligibility_self_attested boolean not null default false,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.guide_profiles enable row level security;
drop policy if exists "Read guide listings or own guide profile" on public.guide_profiles;
create policy "Read guide listings or own guide profile"
 on public.guide_profiles for select to anon, authenticated
 using (is_active or user_id = (select auth.uid()));
drop policy if exists "Create own guide profile" on public.guide_profiles;
create policy "Create own guide profile"
 on public.guide_profiles for insert to authenticated
 with check (user_id = (select auth.uid()));
drop policy if exists "Update own guide profile" on public.guide_profiles;
create policy "Update own guide profile"
 on public.guide_profiles for update to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));
revoke all on public.guide_profiles from anon,authenticated;
grant select on public.guide_profiles to anon;
grant select,insert,update on public.guide_profiles to authenticated;

-- Moderators can later write guide verification decisions from a trusted
-- server-side function only; a guide cannot self-award a "verified" badge.
create table if not exists public.guide_verifications (
  user_id uuid primary key references public.guide_profiles(user_id) on delete cascade,
  verified_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.guide_verifications enable row level security;
revoke all on public.guide_verifications from anon,authenticated;
comment on table public.guide_verifications is
 'Server-managed optional future guide vetting. Never accept client writes to verification status.';

alter table public.partner_trips
  add column if not exists platform_commission_bps integer not null default 1000
    check (platform_commission_bps between 0 and 10000);

-- A new guided listing is paid, owned by an active guide and has a published
-- price that is locked forever. New rate changes only affect new listings.
create or replace function public.lock_guided_trip_terms()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
 if tg_op = 'INSERT' then
   if new.trip_kind = 'guided' then
     if new.finance_mode <> 'fee' or new.contribution_rub <= 0 then
       raise exception 'Guided trips must have a positive fixed price';
     end if;
     if not exists (
       select 1 from public.guide_profiles g
       where g.user_id = new.organizer_id and g.is_active
     ) then
       raise exception 'Activate your guide profile before publishing guided trips';
     end if;
     if not new.safety_briefing or not new.life_jackets_available
        or not new.operator_eligibility_confirmed then
       raise exception 'Safety self-attestations required for guided boat trips';
     end if;
     new.platform_commission_bps := 1000;
   else
     new.platform_commission_bps := 0;
   end if;
 elsif tg_op = 'UPDATE' then
   if old.trip_kind = 'guided' then
     if new.trip_kind is distinct from old.trip_kind
       or new.organizer_id is distinct from old.organizer_id
       or new.finance_mode is distinct from old.finance_mode
       or new.contribution_rub is distinct from old.contribution_rub
       or new.platform_commission_bps is distinct from old.platform_commission_bps
       or new.cost_details is distinct from old.cost_details
       or new.price_includes is distinct from old.price_includes
       or new.cancel_policy is distinct from old.cancel_policy
     then
       raise exception 'Published guide price, conditions and commission cannot change. Close and republish.';
     end if;
   elsif new.trip_kind = 'guided' then
     raise exception 'An existing community trip cannot become a guided trip; create a new listing.';
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists lock_guided_trip_terms on public.partner_trips;
create trigger lock_guided_trip_terms
 before insert or update on public.partner_trips
 for each row execute function public.lock_guided_trip_terms();
revoke execute on function public.lock_guided_trip_terms() from public,anon;

-- A quote is created when the guide accepts a request. It is not a charge.
-- No client role can insert, change or mark a quote as paid.
create table if not exists public.guide_booking_quotes (
  request_id uuid primary key references public.partner_trip_requests(id) on delete cascade,
  trip_id uuid not null references public.partner_trips(id) on delete cascade,
  guide_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  fixed_price_rub integer not null check (fixed_price_rub > 0),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  estimated_commission_rub integer not null check (estimated_commission_rub >= 0),
  estimated_guide_net_rub integer not null check (estimated_guide_net_rub >= 0),
  payment_status text not null default 'not_collected'
    check (payment_status in ('not_collected','paid','refunded','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.guide_booking_quotes enable row level security;
drop policy if exists "Guide and customer see own fixed quote" on public.guide_booking_quotes;
create policy "Guide and customer see own fixed quote"
 on public.guide_booking_quotes for select to authenticated
 using (guide_id = (select auth.uid()) or customer_id = (select auth.uid()));
revoke all on public.guide_booking_quotes from anon,authenticated;
grant select on public.guide_booking_quotes to authenticated;
comment on table public.guide_booking_quotes is
 'Pending immutable price snapshots generated on acceptance; payment_status is not_collected until verified payment processing is connected.';

-- Internal trigger needs to insert a quote despite client INSERT being denied.
-- Function is not exposed via PostgREST; callers cannot execute it directly.
create schema if not exists zapruda_internal;
revoke all on schema zapruda_internal from public,anon;
create or replace function zapruda_internal.record_guide_booking_quote()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
 t public.partner_trips%rowtype;
 fee integer;
begin
 if new.status = 'accepted'
    and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
   select * into t from public.partner_trips where id = new.trip_id;
   if found and t.trip_kind = 'guided' then
     fee := round((t.contribution_rub::numeric * t.platform_commission_bps) / 10000)::integer;
     insert into public.guide_booking_quotes (
       request_id,trip_id,guide_id,customer_id,fixed_price_rub,commission_bps,
       estimated_commission_rub,estimated_guide_net_rub
     ) values (
       new.id,new.trip_id,t.organizer_id,new.applicant_id,t.contribution_rub,
       t.platform_commission_bps,fee,t.contribution_rub - fee
     ) on conflict (request_id) do nothing;
   end if;
 end if;
 return new;
end;
$$;
revoke all on function zapruda_internal.record_guide_booking_quote() from public,anon,authenticated;
drop trigger if exists record_guide_booking_quote on public.partner_trip_requests;
create trigger record_guide_booking_quote
 after insert or update of status on public.partner_trip_requests
 for each row execute function zapruda_internal.record_guide_booking_quote();

comment on column public.partner_trips.platform_commission_bps is
 '1000 = 10%, locked at guided listing creation. No commission is charged before verified payment.';
