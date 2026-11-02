-- ZAPRUDA COMMUNITY: STAGING-only integration DRAFT, NOT APPLIED.
-- Dependencies for /partners and SocialGroups. Review with Grok/Claude.
-- No existing production data, no secrets, no payment acceptance RPC.
-- Execute only in STAGING after code/RLS review.
create table if not exists public.partner_trips (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references public.profiles(id),
 city text not null, destination text not null, departure_at timestamptz not null,
 fishing_method text not null default 'Спиннинг', target_fish text not null default '',
 transport text not null default 'Обсудим', seats smallint not null default 1 check(seats between 1 and 20),
 finance_mode text not null default 'free' check(finance_mode in ('free','split','fee')),
 contribution_rub integer not null default 0 check(contribution_rub >= 0),
 cost_details text not null default '', description text not null default '',
 status text not null default 'open' check(status in ('open','closed')),
 trip_kind text not null default 'community' check(trip_kind in ('community','guided')),
 guide_service text not null default '', boat_type text not null default '',
 sonar_model text not null default '', gear_included text not null default '',
 price_includes text not null default '', cancel_policy text not null default '',
 guide_experience_years smallint, live_sonar_system text not null default 'Нет',
 live_sonar_model text not null default '', platform_commission_bps integer not null default 1000,
 safety_briefing boolean not null default false,life_jackets_available boolean not null default false,
 operator_eligibility_confirmed boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.partner_trip_requests (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.partner_trips(id) on delete cascade,
 applicant_id uuid not null references public.profiles(id), note text not null default '',
 status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),unique(trip_id,applicant_id)
);
create table if not exists public.partner_trip_messages (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.partner_trip_requests(id) on delete cascade,
 sender_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table if not exists public.club_creation_requests (
 id uuid primary key default gen_random_uuid(), applicant_id uuid not null references auth.users(id),
 name text not null,city text not null default '',description text not null default '',
 fee_rub integer not null default 500 check(fee_rub=500),
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','paid','cancelled')),
 payment_reference text,admin_approved boolean not null default false,
 reviewed_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.social_groups (
 id uuid primary key default gen_random_uuid(),name text not null,
 description text not null default '',city text not null default '',
 owner_id uuid not null references auth.users(id),created_at timestamptz not null default now(),
 country text not null default 'Россия', interests text not null default '',
 source_request_id uuid unique references public.club_creation_requests(id)
);
create table if not exists public.social_group_members (
 group_id uuid not null references public.social_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id),role text not null default 'member',
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 invited_by uuid references auth.users(id),created_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create table if not exists public.social_group_messages (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.social_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);

alter table public.partner_trips enable row level security;
alter table public.partner_trip_requests enable row level security;
alter table public.partner_trip_messages enable row level security;
alter table public.club_creation_requests enable row level security;
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.social_group_messages enable row level security;
revoke all on table public.partner_trips,public.partner_trip_requests,public.partner_trip_messages,
 public.club_creation_requests,public.social_groups,public.social_group_members,public.social_group_messages
 from public,anon,authenticated;
grant select,insert on public.partner_trips to authenticated;
grant update (status) on public.partner_trips to authenticated;
grant select,insert on public.partner_trip_requests to authenticated;
grant update (status) on public.partner_trip_requests to authenticated;
grant select,insert on public.partner_trip_messages to authenticated;
grant select,insert on public.club_creation_requests to authenticated;
grant select on public.social_groups,public.social_group_members,public.social_group_messages to authenticated;
grant insert on public.social_group_members,public.social_group_messages to authenticated;

-- Trips visible to signed-in anglers. Guided trip publishing requires dedicated verification
-- and is NOT granted in this draft.
create policy "trips_select" on public.partner_trips for select to authenticated using (true);
create policy "trips_insert_community" on public.partner_trips for insert to authenticated
 with check(organizer_id=(select auth.uid()) and trip_kind='community');
create policy "trips_owner_close" on public.partner_trips for update to authenticated
 using(organizer_id=(select auth.uid())) with check(organizer_id=(select auth.uid()));
create policy "trip_request_select" on public.partner_trip_requests for select to authenticated using (
 applicant_id=(select auth.uid()) or exists (
 select 1 from public.partner_trips t where t.id=trip_id and t.organizer_id=(select auth.uid())));
create policy "trip_request_insert" on public.partner_trip_requests for insert to authenticated
 with check(applicant_id=(select auth.uid()) and status='pending' and exists(
 select 1 from public.partner_trips t where t.id=trip_id and t.organizer_id<>(select auth.uid()) and t.status='open'));
create policy "trip_request_update" on public.partner_trip_requests for update to authenticated
 using(applicant_id=(select auth.uid()) or exists(select 1 from public.partner_trips t where t.id=trip_id and t.organizer_id=(select auth.uid())))
 with check(applicant_id=(select auth.uid()));
-- NOTE: UPDATE(status) further constrained by BEFORE UPDATE trigger, not only RLS:
create or replace function public.staging_trip_request_transition_guard()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare current_user_id uuid := auth.uid(); trip_owner uuid;
begin
 select organizer_id into trip_owner from public.partner_trips where id=old.trip_id;
 if new.trip_id is distinct from old.trip_id or new.applicant_id is distinct from old.applicant_id then
  raise exception 'request participants immutable';
 end if;
 if old.status <> 'pending' then raise exception 'request already finalized'; end if;
 if current_user_id = old.applicant_id and new.status = 'withdrawn' then return new; end if;
 if current_user_id = trip_owner and new.status in ('accepted','declined') then return new; end if;
 raise exception 'unauthorized request transition';
end $$;
revoke execute on function public.staging_trip_request_transition_guard() from public,anon,authenticated;
create trigger staging_trip_request_guard before update on public.partner_trip_requests
 for each row execute function public.staging_trip_request_transition_guard();

create policy "trip_msg_select" on public.partner_trip_messages for select to authenticated using (
 exists(select 1 from public.partner_trip_requests r join public.partner_trips t on t.id=r.trip_id
 where r.id=request_id and r.status='accepted' and
 ((select auth.uid())=r.applicant_id or (select auth.uid())=t.organizer_id)));
create policy "trip_msg_insert" on public.partner_trip_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists(select 1 from public.partner_trip_requests r
 join public.partner_trips t on t.id=r.trip_id where r.id=request_id and r.status='accepted'
 and ((select auth.uid())=r.applicant_id or (select auth.uid())=t.organizer_id)));
-- Club payment status is SERVER ONLY. No authenticated UPDATE on creation requests.
create policy "club_request_self_select" on public.club_creation_requests for select to authenticated
 using(applicant_id=(select auth.uid()));
create policy "club_request_self_insert" on public.club_creation_requests for insert to authenticated
 with check(applicant_id=(select auth.uid()) and fee_rub=500 and status='awaiting_payment'
 and admin_approved=false and payment_reference is null and reviewed_at is null);
-- Clubs are published by a trusted server action after verified payment, never by browser.
create policy "group_view" on public.social_groups for select to authenticated using(true);
create policy "member_view" on public.social_group_members for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.social_groups g
 where g.id=group_id and g.owner_id=(select auth.uid())));
-- NO direct memberships INSERT policy until vetted invite / approval RPC is supplied.
create policy "group_msg_read" on public.social_group_messages for select to authenticated using(
 exists(select 1 from public.social_group_members m where m.group_id=group_id and
 m.user_id=(select auth.uid()) and m.status='accepted'));
create policy "group_msg_insert" on public.social_group_messages for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.social_group_members m
 where m.group_id=group_id and m.user_id=(select auth.uid()) and m.status='accepted'));
-- BLOCKER: group creation, owner membership, 15-seat lock and payment verification
-- require additional trusted server workflow before club feature is enabled.
