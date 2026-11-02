-- Issue #61-B: lock guide quote payment fields to service_role only.
-- Aligns with existing schema from 20261106000000_guide_profiles_commissions.sql:
--   guide_booking_quotes (request_id PK → partner_trip_requests)
-- Does NOT invent guide_booking_inquiries. Requires partner_trips + partner_trip_requests
-- and guide_booking_quotes baseline on STAGING before apply.

alter table if exists public.guide_booking_quotes
  add column if not exists provider_payment_id text,
  add column if not exists contacts_unlocked_at timestamptz;

-- Clients must not mark quotes as paid / unlock contacts / set provider ids.
create or replace function public.guard_guide_quote_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(auth.role(), '') = 'service_role' then
      return new;
    end if;
    if new.payment_status is distinct from old.payment_status
       and new.payment_status in ('paid', 'refunded') then
      raise exception 'GUIDE_QUOTE_PAYMENT_LOCKED' using errcode = '42501';
    end if;
    if new.contacts_unlocked_at is distinct from old.contacts_unlocked_at then
      raise exception 'GUIDE_CONTACTS_UNLOCK_LOCKED' using errcode = '42501';
    end if;
    if new.provider_payment_id is distinct from old.provider_payment_id then
      raise exception 'GUIDE_PROVIDER_PAYMENT_ID_LOCKED' using errcode = '42501';
    end if;
    if new.paid_at is distinct from old.paid_at then
      raise exception 'GUIDE_PAID_AT_LOCKED' using errcode = '42501';
    end if;
    if new.fixed_price_rub is distinct from old.fixed_price_rub
       or new.commission_bps is distinct from old.commission_bps
       or new.estimated_commission_rub is distinct from old.estimated_commission_rub
       or new.estimated_guide_net_rub is distinct from old.estimated_guide_net_rub
       or new.guide_id is distinct from old.guide_id
       or new.customer_id is distinct from old.customer_id
       or new.trip_id is distinct from old.trip_id then
      raise exception 'GUIDE_QUOTE_IMMUTABLE_FIELDS' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_guide_quote_payment on public.guide_booking_quotes;
create trigger trg_guard_guide_quote_payment
  before update on public.guide_booking_quotes
  for each row execute function public.guard_guide_quote_payment_fields();

-- No client INSERT into quotes (server trigger only in baseline).
revoke insert, update, delete on public.guide_booking_quotes from anon, authenticated;
grant select on public.guide_booking_quotes to authenticated;

-- Service-role only mark paid. Still NOT a substitute for provider settlement proof.
-- Edge webhook must remain fail-closed until real provider signature + amount checks exist.
create or replace function public.mark_guide_booking_paid_from_provider(
  p_request_id uuid,
  p_provider_payment_id text,
  p_settlement_confirmed boolean default false
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
  -- Hard gate: never mark paid unless caller asserts verified settlement.
  if coalesce(p_settlement_confirmed, false) is not true then
    raise exception 'SETTLEMENT_NOT_CONFIRMED';
  end if;

  update public.guide_booking_quotes
  set payment_status = 'paid',
      paid_at = coalesce(paid_at, now()),
      contacts_unlocked_at = coalesce(contacts_unlocked_at, now()),
      provider_payment_id = p_provider_payment_id
  where request_id = p_request_id
    and payment_status in ('not_collected', 'paid');
end;
$$;

revoke all on function public.mark_guide_booking_paid_from_provider(uuid, text, boolean) from public, anon, authenticated;

comment on function public.mark_guide_booking_paid_from_provider(uuid, text, boolean) is
  'Service-role only. Call only after verified provider settlement (signature+amount). Not callable by clients. Shared webhook secret alone is insufficient.';
