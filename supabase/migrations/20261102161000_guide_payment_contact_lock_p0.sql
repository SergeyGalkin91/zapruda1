-- Issue #61 / PR B: lock paid status and contact unlock to server-side only.
-- Apply on STAGING. No payment provider webhook is simulated as success.

-- 1) Clients must not mark inquiries/quotes as paid.
create or replace function public.guard_guide_inquiry_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status
       and new.status in ('paid', 'refunded')
       and coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'GUIDE_PAYMENT_STATUS_LOCKED'
        using errcode = '42501';
    end if;
    if new.contacts_unlocked_at is distinct from old.contacts_unlocked_at
       and coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'GUIDE_CONTACTS_UNLOCK_LOCKED'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_guide_inquiry_payment on public.guide_booking_inquiries;
alter table if exists public.guide_booking_inquiries
  add column if not exists contacts_unlocked_at timestamptz;

create trigger trg_guard_guide_inquiry_payment
  before update on public.guide_booking_inquiries
  for each row
  execute function public.guard_guide_inquiry_payment_fields();

create or replace function public.guard_guide_quote_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.payment_status is distinct from old.payment_status
       and new.payment_status in ('paid', 'refunded')
       and coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'GUIDE_QUOTE_PAYMENT_LOCKED'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_guide_quote_payment on public.guide_booking_quotes;
create trigger trg_guard_guide_quote_payment
  before update on public.guide_booking_quotes
  for each row
  execute function public.guard_guide_quote_payment_fields();

-- 2) Reviews require server-unlocked paid booking (contacts_unlocked_at set)
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
        and i.contacts_unlocked_at is not null
    )
  );

-- 3) Placeholder RPC for future verified webhook (service_role only)
create or replace function public.mark_guide_booking_paid_from_provider(
  p_inquiry_id uuid,
  p_provider_payment_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'ONLY_SERVICE_ROLE' using errcode = '42501';
  end if;
  if p_provider_payment_id is null or char_length(btrim(p_provider_payment_id)) < 4 then
    raise exception 'PROVIDER_PAYMENT_ID_REQUIRED';
  end if;

  update public.guide_booking_inquiries
  set status = 'paid',
      contacts_unlocked_at = coalesce(contacts_unlocked_at, now()),
      provider_payment_id = p_provider_payment_id
  where id = p_inquiry_id
    and status in ('quoted', 'awaiting_payment', 'requested', 'paid');

  update public.guide_booking_quotes q
  set payment_status = 'paid',
      paid_at = coalesce(paid_at, now())
  from public.guide_booking_inquiries i
  where i.id = p_inquiry_id
    and q.request_id = i.id;
end;
$$;

revoke all on function public.mark_guide_booking_paid_from_provider(uuid, text) from public, anon, authenticated;

comment on function public.mark_guide_booking_paid_from_provider(uuid, text) is
  'Service-role only. Call from verified payment webhook after signature check. Not callable by clients.';
