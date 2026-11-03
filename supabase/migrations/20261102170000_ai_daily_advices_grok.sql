-- Issue #61 / PR C: daily AI advice journal (Grok). Key never in client.

create table if not exists public.ai_daily_advices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  advice_day date not null,
  prompt_summary text not null default '' check (char_length(prompt_summary) <= 500),
  answer text not null default '' check (char_length(answer) <= 8000),
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 20),
  model text not null default '' check (char_length(model) <= 80),
  error_message text not null default '' check (char_length(error_message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, advice_day)
);

create index if not exists ai_daily_advices_user_day_idx
  on public.ai_daily_advices (user_id, advice_day desc);

alter table public.ai_daily_advices enable row level security;

drop policy if exists "Users read own ai advices" on public.ai_daily_advices;
create policy "Users read own ai advices"
  on public.ai_daily_advices for select to authenticated
  using (user_id = auth.uid());

revoke all on public.ai_daily_advices from anon, authenticated;
grant select on public.ai_daily_advices to authenticated;
