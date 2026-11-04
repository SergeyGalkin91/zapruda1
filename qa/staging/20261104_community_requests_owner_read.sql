-- ZAPRUDA STAGING ONLY (yudtbifopfnjtjanaqrd), review before use.
-- Endpoint submit-community-request is NOT yet deployed to STAGING.
-- This migration restores the storage/read contract only, NOT submission.
CREATE TABLE public.community_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_type text not null check (request_type in ('improvement','cooperation','bug')),
 category text not null default '' check(length(category)<=80),
 subject text not null check(length(btrim(subject)) between 4 and 120),
 body text not null check(length(btrim(body)) between 15 and 2000),
 contact text not null default '' check(length(contact)<=180),
 review_status text not null default 'new' check (review_status in ('new','in_review','resolved','closed')),
 telegram_status text not null default 'pending' check (telegram_status in ('pending','processing','sent','failed')),
 telegram_attempts integer not null default 0 check (telegram_attempts between 0 and 100),
 telegram_sent_at timestamptz,
 created_at timestamptz not null default now()
);
create index community_requests_user_recent_idx on public.community_requests(user_id,created_at desc);
create index community_requests_pending_idx on public.community_requests(telegram_status,created_at)
 where telegram_status<>'sent';
alter table public.community_requests enable row level security;
revoke all privileges on public.community_requests from PUBLIC,anon,authenticated;
grant select(id,request_type,subject,created_at,review_status,telegram_status)
 on public.community_requests to authenticated;
create policy staging_community_requests_owner_read on public.community_requests
 for select to authenticated using (user_id=(select auth.uid()));
-- Deliberately NO user INSERT/UPDATE/DELETE privileges:
-- Submission is brokered by verified Edge Function with server-side checks.
-- Do not create a permissive admin read policy or expose sensitive body/contact
-- before the separate admin/auth review. No rows are copied from PROD.
