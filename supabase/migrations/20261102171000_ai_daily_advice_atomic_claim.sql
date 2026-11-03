-- Issue #61-C: atomic claim/lease for daily AI advice (prevents double xAI spend).
-- Additive on already-applied 20261102170000_ai_daily_advices_grok.sql

alter table public.ai_daily_advices
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz;

create or replace function public.claim_ai_daily_advice_slot(
  p_user_id uuid,
  p_advice_day date,
  p_prompt_summary text,
  p_max_failed integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ai_daily_advices%rowtype;
  token uuid := gen_random_uuid();
  summary text := left(coalesce(p_prompt_summary, ''), 500);
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'ONLY_SERVICE_ROLE' using errcode = '42501';
  end if;
  if p_user_id is null or p_advice_day is null then
    raise exception 'USER_DAY_REQUIRED';
  end if;

  -- Insert or no-op on conflict, then lock the row.
  insert into public.ai_daily_advices (user_id, advice_day, prompt_summary, status, attempts)
  values (p_user_id, p_advice_day, summary, 'pending', 0)
  on conflict (user_id, advice_day) do nothing;

  select * into r
  from public.ai_daily_advices
  where user_id = p_user_id and advice_day = p_advice_day
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing_row');
  end if;

  if r.status = 'ready' and char_length(coalesce(r.answer, '')) > 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_used',
      'answer', r.answer,
      'id', r.id
    );
  end if;

  if r.status = 'failed' and r.attempts >= p_max_failed then
    return jsonb_build_object('ok', false, 'reason', 'too_many_failures', 'id', r.id);
  end if;

  -- Active lease held by another worker?
  if r.status = 'pending'
     and r.lease_token is not null
     and r.lease_expires_at is not null
     and r.lease_expires_at > now() then
    return jsonb_build_object('ok', false, 'reason', 'lease_held', 'id', r.id);
  end if;

  update public.ai_daily_advices
  set status = 'pending',
      prompt_summary = case when summary <> '' then summary else prompt_summary end,
      lease_token = token,
      lease_expires_at = now() + interval '45 seconds',
      updated_at = now()
  where id = r.id;

  return jsonb_build_object(
    'ok', true,
    'id', r.id,
    'lease_token', token,
    'attempts', r.attempts
  );
end;
$$;

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
  if r.lease_token is distinct from p_lease_token then
    return jsonb_build_object('ok', false, 'reason', 'lease_mismatch');
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

revoke all on function public.claim_ai_daily_advice_slot(uuid, date, text, integer) from public, anon, authenticated;
revoke all on function public.complete_ai_daily_advice_slot(uuid, uuid, boolean, text, text, text) from public, anon, authenticated;
