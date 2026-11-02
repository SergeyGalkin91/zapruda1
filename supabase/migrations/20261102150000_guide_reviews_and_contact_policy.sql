-- Stage 5: reviews only after paid guide booking; contact unlock field.
-- Apply on STAGING first. Do not run on production without owner approval.

alter table if exists public.guide_booking_inquiries
  add column if not exists contacts_unlocked_at timestamptz;

comment on column public.guide_booking_inquiries.contacts_unlocked_at is
  'Set when payment is verified. Until then clients should not exchange external contacts.';

create table if not exists public.guide_reviews (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references public.guide_booking_inquiries (id) on delete cascade,
  guide_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(btrim(body)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists guide_reviews_guide_id_idx on public.guide_reviews (guide_id);

alter table public.guide_reviews enable row level security;

drop policy if exists "Anyone can read guide reviews" on public.guide_reviews;
create policy "Anyone can read guide reviews"
  on public.guide_reviews for select to anon, authenticated
  using (true);

drop policy if exists "Customer reviews only paid bookings" on public.guide_reviews;
create policy "Customer reviews only paid bookings"
  on public.guide_reviews for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.guide_booking_inquiries i
      where i.id = inquiry_id
        and i.customer_id = auth.uid()
        and i.guide_id = guide_reviews.guide_id
        and i.status = 'paid'
    )
  );

grant select on public.guide_reviews to anon, authenticated;
grant insert on public.guide_reviews to authenticated;
