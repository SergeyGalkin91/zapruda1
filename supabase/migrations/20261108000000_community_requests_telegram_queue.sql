-- ZAPRUDA: confidential feedback, improvements and partnership enquiries.
-- Submissions are accepted ONLY by the authenticated Edge Function
-- using its server-side secret key; app clients can read only their own.
create table if not exists public.community_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('improvement','cooperation','bug')),
  category text not null default '' check (char_length(category) <= 80),
  subject text not null check (char_length(btrim(subject)) between 4 and 120),
  body text not null check (char_length(btrim(body)) between 15 and 2000),
  contact text not null default '' check (char_length(contact) <= 180),
  review_status text not null default 'new'
    check (review_status in ('new','in_review','resolved','closed')),
  telegram_status text not null default 'pending'
    check (telegram_status in ('pending','sent','failed')),
  telegram_attempts integer not null default 0
    check (telegram_attempts between 0 and 100),
  telegram_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists community_requests_user_recent_idx
  on public.community_requests(user_id,created_at desc);
create index if not exists community_requests_pending_idx
  on public.community_requests(telegram_status,created_at)
  where telegram_status <> 'sent';

alter table public.community_requests enable row level security;
drop policy if exists "Read my own contact requests" on public.community_requests;
create policy "Read my own contact requests"
  on public.community_requests for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.community_requests from anon, authenticated;
grant select on public.community_requests to authenticated;

comment on table public.community_requests is
  'Confidential user messages. Only the server-side authenticated Edge Function inserts. Telegram credentials are never persisted here. Pending messages are retained if Telegram delivery fails.';
comment on column public.community_requests.telegram_status is
  'sent only after Telegram Bot API confirms success; pending/failed are retained for follow-up.';
