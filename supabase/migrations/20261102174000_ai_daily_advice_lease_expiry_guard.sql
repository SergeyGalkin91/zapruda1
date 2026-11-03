-- v0.7.1 STAGING: reject stale/replayed AI lease completions.
-- Replaces function only; no data deletion.
create or replace function public.complete_ai_daily_advice_slot(
  p_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_answer text default '',
  p_model text default '',
  p_error_message text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ai_daily_advices%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'ONLY_SERVICE_ROLE' using errcode = '42501';
  end if;

  select * into r from public.ai_daily_advices where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing_row');
  end if;
  -- Fail closed for null/replayed/stale tokens, expired leases and completed rows.
  if p_lease_token is null or r.lease_token is null
     or r.lease_token is distinct from p_lease_token then
    return jsonb_build_object('ok', false, 'reason', 'lease_mismatch');
  end if;
  if r.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;
  if r.lease_expires_at is null or r.lease_expires_at <= clock_timestamp() then
    return jsonb_build_object('ok', false, 'reason', 'lease_expired');
  end if;

  if p_success then
    update public.ai_daily_advices
    set status = 'ready',
        answer = left(coalesce(p_answer, ''), 8000),
        model = left(coalesce(p_model, ''), 80),
        error_message = '',
        attempts = attempts + 1,
        lease_token = null,
        lease_expires_at = null,
        updated_at = now()
    where id = p_id;
  else
    update public.ai_daily_advices
    set status = 'failed',
        error_message = left(coalesce(p_error_message, ''), 500),
        model = left(coalesce(p_model, ''), 80),
        attempts = attempts + 1,
        lease_token = null,
        lease_expires_at = null,
        updated_at = now()
    where id = p_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;


revoke all on function public.complete_ai_daily_advice_slot(uuid, uuid, boolean, text, text, text) from public, anon, authenticated;
