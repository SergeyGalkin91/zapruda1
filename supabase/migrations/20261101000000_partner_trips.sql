-- ZAPRUDA | fishing trip partner matching
-- Apply only after reviewing current Supabase RLS schema.
create table if not exists public.partner_trips (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  city text not null check (char_length(trim(city)) between 2 and 100),
  destination text not null check (char_length(trim(destination)) between 2 and 150),
  departure_at timestamptz not null,
  fishing_method text not null default 'Спиннинг' check (char_length(fishing_method) <= 100),
  target_fish text not null default '' check (char_length(target_fish) <= 100),
  transport text not null default 'Обсудим' check (transport in ('Есть машина', 'Нужна машина', 'Своим ходом', 'Обсудим')),
  seats smallint not null default 1 check (seats between 1 and 8),
  finance_mode text not null default 'free' check (finance_mode in ('free', 'split', 'fee')),
  contribution_rub integer not null default 0 check (contribution_rub between 0 and 500000),
  cost_details text not null default '' check (char_length(cost_details) <= 500),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  check (finance_mode <> 'free' or contribution_rub = 0)
);

create index if not exists partner_trips_open_date_idx
  on public.partner_trips(status, departure_at);
create index if not exists partner_trips_organizer_idx
  on public.partner_trips(organizer_id, created_at desc);

create table if not exists public.partner_trip_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.partner_trips(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (trip_id, applicant_id)
);

create index if not exists partner_requests_applicant_idx
  on public.partner_trip_requests(applicant_id, created_at desc);
create index if not exists partner_requests_trip_status_idx
  on public.partner_trip_requests(trip_id, status);

create table if not exists public.partner_trip_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.partner_trip_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists partner_trip_messages_thread_idx
  on public.partner_trip_messages(request_id, created_at);

alter table public.partner_trips enable row level security;
alter table public.partner_trip_requests enable row level security;
alter table public.partner_trip_messages enable row level security;

drop policy if exists "Read fishing partner outings" on public.partner_trips;
create policy "Read fishing partner outings" on public.partner_trips
  for select to anon, authenticated using (true);
drop policy if exists "Create own fishing partner outings" on public.partner_trips;
create policy "Create own fishing partner outings" on public.partner_trips
  for insert to authenticated with check (organizer_id = auth.uid());
drop policy if exists "Close own fishing partner outings" on public.partner_trips;
create policy "Close own fishing partner outings" on public.partner_trips
  for update to authenticated using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

drop policy if exists "Read own or organized outing requests" on public.partner_trip_requests;
create policy "Read own or organized outing requests" on public.partner_trip_requests
  for select to authenticated using (
    applicant_id = auth.uid()
    or exists (select 1 from public.partner_trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
drop policy if exists "Request a place on a fishing outing" on public.partner_trip_requests;
create policy "Request a place on a fishing outing" on public.partner_trip_requests
  for insert to authenticated with check (
    applicant_id = auth.uid() and status = 'pending'
    and exists (
      select 1 from public.partner_trips t where t.id = trip_id
      and t.organizer_id <> auth.uid() and t.status = 'open' and t.departure_at > now()
    )
  );
drop policy if exists "Organizers decide on applicants" on public.partner_trip_requests;
create policy "Organizers decide on applicants" on public.partner_trip_requests
  for update to authenticated using (
    exists (select 1 from public.partner_trips t where t.id = trip_id and t.organizer_id = auth.uid())
  )
  with check (
    status in ('accepted','declined')
    and exists (select 1 from public.partner_trips t where t.id = trip_id and t.organizer_id = auth.uid())
  );
drop policy if exists "Applicants withdraw from outings" on public.partner_trip_requests;
create policy "Applicants withdraw from outings" on public.partner_trip_requests
  for update to authenticated using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid() and status = 'withdrawn');

drop policy if exists "Participants read approved trip chat" on public.partner_trip_messages;
create policy "Participants read approved trip chat" on public.partner_trip_messages
  for select to authenticated using (
    exists (
      select 1 from public.partner_trip_requests r
      join public.partner_trips t on t.id = r.trip_id
      where r.id = request_id and r.status = 'accepted'
      and (r.applicant_id = auth.uid() or t.organizer_id = auth.uid())
    )
  );
drop policy if exists "Participants send approved trip chat" on public.partner_trip_messages;
create policy "Participants send approved trip chat" on public.partner_trip_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.partner_trip_requests r
      join public.partner_trips t on t.id = r.trip_id
      where r.id = request_id and r.status = 'accepted'
      and (r.applicant_id = auth.uid() or t.organizer_id = auth.uid())
    )
  );

-- Cap accepted applicants even under concurrent organizer actions.
create or replace function public.check_partner_trip_capacity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare available_seats integer;
declare accepted_count integer;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select seats into available_seats
      from public.partner_trips where id = new.trip_id and status = 'open'
      for update;
    if available_seats is null then
      raise exception 'Этот выезд закрыт';
    end if;
    select count(*) into accepted_count
      from public.partner_trip_requests
      where trip_id = new.trip_id and status = 'accepted' and id <> new.id;
    if accepted_count >= available_seats then
      raise exception 'На выезд больше нет свободных мест';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_partner_trip_capacity on public.partner_trip_requests;
create trigger enforce_partner_trip_capacity
  before update of status on public.partner_trip_requests
  for each row execute function public.check_partner_trip_capacity();

-- Restrict updates to status only; applicants can't rewrite identities or trip IDs.
revoke update on public.partner_trips from authenticated;
revoke update on public.partner_trip_requests from authenticated;
grant select, insert on public.partner_trips to authenticated;
grant select, insert on public.partner_trip_requests to authenticated;
grant select, insert on public.partner_trip_messages to authenticated;
grant select on public.partner_trips to anon;
grant update(status) on public.partner_trips to authenticated;
grant update(status) on public.partner_trip_requests to authenticated;
