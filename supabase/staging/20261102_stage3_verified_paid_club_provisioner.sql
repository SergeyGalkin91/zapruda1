-- STAGING ONLY: verified-payment club provisioner. No payment provider integration here.
-- A trusted webhook must independently validate signed provider events before inserting receipt.
create table if not exists public.club_verified_payments (
  request_id uuid primary key references public.club_creation_requests(id),
  provider text not null check(length(provider) between 2 and 80),
  provider_event_id text not null unique check(length(provider_event_id) between 8 and 250),
  amount_rub integer not null check(amount_rub=500),
  verified_at timestamptz not null,
  recorded_at timestamptz not null default now()
);
alter table public.club_verified_payments enable row level security;
revoke all privileges on public.club_verified_payments from public, anon, authenticated;
-- service_role is the only API role permitted to record independently verified events.
grant select, insert on public.club_verified_payments to service_role;
-- No authenticated/anon policies: receipt cannot be forged from the browser.

create or replace function public.staging_provision_paid_club(p_request_id uuid)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public as $$
declare r public.club_creation_requests%rowtype; existing_id uuid; created_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;
  select * into r from public.club_creation_requests where id=p_request_id for update;
  if not found then raise exception 'CLUB_REQUEST_NOT_FOUND' using errcode='22023'; end if;
  select id into existing_id from public.social_groups where source_request_id=p_request_id;
  if existing_id is not null then return existing_id; end if;
  if r.status <> 'awaiting_payment' or r.fee_rub<>500 then
    raise exception 'CLUB_PAYMENT_STATE_INVALID' using errcode='23514';
  end if;
  if not exists(select 1 from public.club_verified_payments p
    where p.request_id=r.id and p.amount_rub=500 and p.verified_at is not null) then
    raise exception 'VERIFIED_PAYMENT_REQUIRED' using errcode='23514';
  end if;
  insert into public.social_groups(name,description,city,owner_id,source_request_id)
  values(r.name,r.description,r.city,r.applicant_id,r.id) returning id into created_id;
  insert into public.social_group_members(group_id,user_id,role,status,invited_by)
  values(created_id,r.applicant_id,'owner','accepted',null);
  update public.club_creation_requests set status='paid',admin_approved=true,reviewed_at=now()
    where id=p_request_id;
  return created_id;
end $$;
revoke all on function public.staging_provision_paid_club(uuid) from public, anon, authenticated;
grant execute on function public.staging_provision_paid_club(uuid) to service_role;
-- Warning: this is provisioning, not a payment processor. Do not expose
-- provider receipt writes or service role credentials in client-side code.
