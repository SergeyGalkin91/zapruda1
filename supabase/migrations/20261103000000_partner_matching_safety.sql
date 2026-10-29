-- ZAPRUDA: fishing partner compatibility and interpersonal safety.
-- Existing trips/accounts remain intact; new fields have conservative defaults.

alter table public.partner_trips
  add column if not exists experience_needed text not null default 'Любой уровень'
    check (experience_needed in ('Любой уровень','Помогу новичку','Нужен опыт')),
  add column if not exists social_style text not null default 'Не важно'
    check (social_style in ('Не важно','Общительная компания','Тихая рыбалка')),
  add column if not exists duration_hours integer
    check (duration_hours between 1 and 72),
  add column if not exists meeting_area text not null default ''
    check (char_length(meeting_area) <= 180),
  add column if not exists gear_requirements text not null default ''
    check (char_length(gear_requirements) <= 500),
  add column if not exists safety_notes text not null default ''
    check (char_length(safety_notes) <= 500),
  add column if not exists boat_trip boolean not null default false;

create table if not exists public.partner_user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  constraint partner_user_blocks_no_self check (blocker_id <> blocked_id)
);
create index if not exists partner_user_blocks_target_idx on public.partner_user_blocks(blocked_id);
alter table public.partner_user_blocks enable row level security;
drop policy if exists "Users see whom they blocked" on public.partner_user_blocks;
create policy "Users see whom they blocked" on public.partner_user_blocks
 for select to authenticated using (blocker_id = (select auth.uid()));
drop policy if exists "Users block people themselves" on public.partner_user_blocks;
create policy "Users block people themselves" on public.partner_user_blocks
 for insert to authenticated with check (blocker_id = (select auth.uid()));
drop policy if exists "Users unblock people themselves" on public.partner_user_blocks;
create policy "Users unblock people themselves" on public.partner_user_blocks
 for delete to authenticated using (blocker_id = (select auth.uid()));
revoke all on public.partner_user_blocks from anon,authenticated;
grant select,insert,delete on public.partner_user_blocks to authenticated;

create table if not exists public.partner_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.partner_trips(id) on delete set null,
  reason text not null check (reason in ('rude','threat','fraud','spam','unsafe','other')),
  details text not null default '' check (char_length(details) between 0 and 2000),
  review_status text not null default 'new' check (review_status in ('new','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  constraint partner_user_reports_no_self check (reporter_id <> reported_id)
);
create index if not exists partner_reports_pending_idx on public.partner_user_reports(review_status,created_at);
alter table public.partner_user_reports enable row level security;
drop policy if exists "Users read reports they submitted" on public.partner_user_reports;
create policy "Users read reports they submitted" on public.partner_user_reports
 for select to authenticated using (reporter_id = (select auth.uid()));
drop policy if exists "Users submit reports for review" on public.partner_user_reports;
create policy "Users submit reports for review" on public.partner_user_reports
 for insert to authenticated with check (
  reporter_id = (select auth.uid()) and review_status = 'new'
  and (trip_id is null or exists(
    select 1 from public.partner_trips t
    where t.id = trip_id and t.organizer_id = reported_id
  ))
 );
revoke all on public.partner_user_reports from anon,authenticated;
grant select,insert on public.partner_user_reports to authenticated;

-- The helper is NOT placed in an exposed schema and does not disclose block lists.
-- It can only check whether the signed-in caller and a target user have blocked
-- one another. This is required in policies because other people's block rows
-- are hidden from normal RLS SELECT queries.
create schema if not exists zapruda_internal;
revoke all on schema zapruda_internal from public,anon;
grant usage on schema zapruda_internal to authenticated;

create or replace function zapruda_internal.partner_blocked_with(target_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when (select auth.uid()) is null or target_user is null then false
    else exists (
      select 1 from public.partner_user_blocks b
      where
        (b.blocker_id = (select auth.uid()) and b.blocked_id = target_user)
        or (b.blocked_id = (select auth.uid()) and b.blocker_id = target_user)
    )
  end;
$$;
revoke execute on function zapruda_internal.partner_blocked_with(uuid) from public,anon;
grant execute on function zapruda_internal.partner_blocked_with(uuid) to authenticated;

-- Public trips remain browseable without login. Signed-in users cannot browse
-- each other's trips after either side blocks the other.
drop policy if exists "Read fishing partner outings" on public.partner_trips;
drop policy if exists "Anonymous browse outings" on public.partner_trips;
create policy "Anonymous browse outings" on public.partner_trips
 for select to anon using (true);
drop policy if exists "Members browse unblocked outings" on public.partner_trips;
create policy "Members browse unblocked outings" on public.partner_trips
 for select to authenticated
 using (not zapruda_internal.partner_blocked_with(organizer_id));

drop policy if exists "Read own or organized outing requests" on public.partner_trip_requests;
create policy "Read own or organized outing requests" on public.partner_trip_requests
 for select to authenticated using (
  (applicant_id = (select auth.uid())
   and not exists (
     select 1 from public.partner_trips t
     where t.id = trip_id and zapruda_internal.partner_blocked_with(t.organizer_id)
   ))
  or exists (
    select 1 from public.partner_trips t
    where t.id = trip_id
      and t.organizer_id = (select auth.uid())
      and not zapruda_internal.partner_blocked_with(applicant_id)
  )
 );
drop policy if exists "Request a place on a fishing outing" on public.partner_trip_requests;
create policy "Request a place on a fishing outing" on public.partner_trip_requests
 for insert to authenticated with check (
  applicant_id = (select auth.uid()) and status = 'pending'
  and exists (
    select 1 from public.partner_trips t where t.id = trip_id
      and t.organizer_id <> (select auth.uid())
      and t.status = 'open' and t.departure_at > now()
      and not zapruda_internal.partner_blocked_with(t.organizer_id)
  )
 );
drop policy if exists "Organizers decide on applicants" on public.partner_trip_requests;
create policy "Organizers decide on applicants" on public.partner_trip_requests
 for update to authenticated using (
   exists (
     select 1 from public.partner_trips t
     where t.id = trip_id and t.organizer_id = (select auth.uid())
       and not zapruda_internal.partner_blocked_with(applicant_id)
   )
 )
 with check (
   status in ('accepted','declined')
   and exists (
     select 1 from public.partner_trips t
     where t.id = trip_id and t.organizer_id = (select auth.uid())
       and not zapruda_internal.partner_blocked_with(applicant_id)
   )
 );
drop policy if exists "Applicants withdraw from outings" on public.partner_trip_requests;
create policy "Applicants withdraw from outings" on public.partner_trip_requests
 for update to authenticated using (applicant_id = (select auth.uid()))
 with check (applicant_id = (select auth.uid()) and status = 'withdrawn');

drop policy if exists "Participants read approved trip chat" on public.partner_trip_messages;
create policy "Participants read approved trip chat" on public.partner_trip_messages
 for select to authenticated using (
  exists (
    select 1 from public.partner_trip_requests r
    join public.partner_trips t on t.id = r.trip_id
    where r.id = request_id and r.status = 'accepted'
    and (
      (r.applicant_id = (select auth.uid())
       and not zapruda_internal.partner_blocked_with(t.organizer_id))
      or (t.organizer_id = (select auth.uid())
       and not zapruda_internal.partner_blocked_with(r.applicant_id))
    )
  )
 );
drop policy if exists "Participants send approved trip chat" on public.partner_trip_messages;
create policy "Participants send approved trip chat" on public.partner_trip_messages
 for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.partner_trip_requests r
    join public.partner_trips t on t.id = r.trip_id
    where r.id = request_id and r.status = 'accepted'
    and (
      (r.applicant_id = (select auth.uid())
       and not zapruda_internal.partner_blocked_with(t.organizer_id))
      or (t.organizer_id = (select auth.uid())
       and not zapruda_internal.partner_blocked_with(r.applicant_id))
    )
  )
 );
