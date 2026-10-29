-- Private fishing-structure and promising-spot pins, never exposed publicly.
create table if not exists public.private_fishing_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('promising','snag','dropoff','hole','riffle','other')),
  title text not null check (char_length(btrim(title)) between 2 and 80),
  note text not null default '' check (char_length(note) <= 700),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);
create index if not exists private_fishing_marks_owner_created_idx
  on public.private_fishing_marks(user_id, created_at desc);
alter table public.private_fishing_marks enable row level security;
revoke all on public.private_fishing_marks from anon;
grant select, insert, delete on public.private_fishing_marks to authenticated;
drop policy if exists "Read my private fishing marks" on public.private_fishing_marks;
create policy "Read my private fishing marks" on public.private_fishing_marks
 for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Insert my private fishing marks" on public.private_fishing_marks;
create policy "Insert my private fishing marks" on public.private_fishing_marks
 for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Delete my private fishing marks" on public.private_fishing_marks;
create policy "Delete my private fishing marks" on public.private_fishing_marks
 for delete to authenticated using (user_id = (select auth.uid()));
comment on table public.private_fishing_marks is 'Private fishing coordinates and structure notes, owner-only through RLS; never add to public feed.';