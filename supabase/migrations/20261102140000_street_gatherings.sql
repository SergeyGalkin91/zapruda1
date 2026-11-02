-- Stage 4: evening street gatherings (social company, not personal GPS diary).
-- Apply on STAGING first. Exact coordinates stay private to organizer + accepted members.

create table if not exists public.street_gatherings (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  area_label text not null check (char_length(btrim(area_label)) between 2 and 120),
  meet_lat double precision,
  meet_lng double precision,
  starts_at timestamptz not null,
  seats integer not null check (seats between 2 and 6),
  notes text not null default '' check (char_length(notes) <= 500),
  status text not null default 'open'
    check (status in ('open', 'full', 'cancelled', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists street_gatherings_starts_at_idx
  on public.street_gatherings (starts_at desc);
create index if not exists street_gatherings_status_idx
  on public.street_gatherings (status);

create table if not exists public.street_gathering_members (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references public.street_gatherings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (gathering_id, user_id)
);

create index if not exists street_gathering_members_gathering_idx
  on public.street_gathering_members (gathering_id);

alter table public.street_gatherings enable row level security;
alter table public.street_gathering_members enable row level security;

drop policy if exists "Anyone auth can list open street gatherings" on public.street_gatherings;
create policy "Anyone auth can list open street gatherings"
  on public.street_gatherings for select to authenticated
  using (
    status in ('open', 'full', 'done')
    or organizer_id = auth.uid()
  );

drop policy if exists "Users create own street gatherings" on public.street_gatherings;
create policy "Users create own street gatherings"
  on public.street_gatherings for insert to authenticated
  with check (organizer_id = auth.uid());

drop policy if exists "Organizer updates own street gatherings" on public.street_gatherings;
create policy "Organizer updates own street gatherings"
  on public.street_gatherings for update to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

drop policy if exists "Members and organizer read gathering membership" on public.street_gathering_members;
create policy "Members and organizer read gathering membership"
  on public.street_gathering_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.street_gatherings g
      where g.id = gathering_id and g.organizer_id = auth.uid()
    )
  );

drop policy if exists "Users apply to gatherings" on public.street_gathering_members;
create policy "Users apply to gatherings"
  on public.street_gathering_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.street_gatherings g
      where g.id = gathering_id and g.status = 'open' and g.organizer_id <> auth.uid()
    )
  );

drop policy if exists "Applicant or organizer update membership" on public.street_gathering_members;
create policy "Applicant or organizer update membership"
  on public.street_gathering_members for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.street_gatherings g
      where g.id = gathering_id and g.organizer_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.street_gatherings g
      where g.id = gathering_id and g.organizer_id = auth.uid()
    )
  );

create or replace function public.enforce_street_gathering_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_seats integer;
  accepted_count integer;
begin
  if new.status is distinct from 'accepted' then
    return new;
  end if;

  select seats into max_seats from public.street_gatherings where id = new.gathering_id;
  if max_seats is null then
    raise exception 'GATHERING_NOT_FOUND';
  end if;

  select count(*)::integer into accepted_count
  from public.street_gathering_members m
  where m.gathering_id = new.gathering_id
    and m.status = 'accepted'
    and not (tg_op = 'UPDATE' and m.user_id = old.user_id and m.gathering_id = old.gathering_id);

  if accepted_count + 1 >= max_seats then
    raise exception 'GATHERING_FULL: мест больше нет'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_street_gathering_seats on public.street_gathering_members;
create trigger trg_street_gathering_seats
  before insert or update of status
  on public.street_gathering_members
  for each row
  execute function public.enforce_street_gathering_seats();

grant select, insert, update on public.street_gatherings to authenticated;
grant select, insert, update on public.street_gathering_members to authenticated;
