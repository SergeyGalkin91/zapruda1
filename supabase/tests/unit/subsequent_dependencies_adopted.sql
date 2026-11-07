-- DISPOSABLE TEST BASELINE ONLY. Subsequent STAGING 004040/005024/005501/010044. NEVER replay hosted.
-- STAGING-only: the UI explicitly offers 'Общий чат' (GLOBAL_ID).
-- The current geographic send policy rejects level=global; preserve its
-- country/region/city restrictions, and add a dedicated global-room policy.
-- The separate RESTRICTIVE pilot_chat_confirmed_write policy continues to
-- require a confirmed, non-anonymous Auth user for every INSERT.
-- Target: yudtbifopfnjtjanaqrd. Never auto-apply to production.
create policy staging_geo_messages_global_send
on public.chat_messages
as permissive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and place_id = '00000000-0000-4000-8000-000000000001'::uuid
  and exists (
    select 1 from public.chat_places p
    where p.id = chat_messages.place_id
      and p.level = 'global'
  )
);

-- ZAPRUDA STAGING-only admin role lookup table (empty).
-- Target: yudtbifopfnjtjanaqrd. DO NOT add to production migration chain.
-- Does NOT appoint or grant admin privileges to any account.
-- Mirrors metadata-only production schema for Shell and admin-route role checks.
create table public.zapruda_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.zapruda_admins enable row level security;

-- Supabase default ACL may be permissive: explicitly revoke before granting.
revoke all on public.zapruda_admins from PUBLIC, anon, authenticated;
grant select (user_id) on public.zapruda_admins to authenticated;

create policy staging_admin_read_own_membership on public.zapruda_admins
 for select to authenticated
 using (user_id=(select auth.uid()));

-- No API INSERT/UPDATE/DELETE/REFERENCES/TRUNCATE privileges.
-- No membership rows are inserted. Admin provisioning is a separate review gate.

-- STAGING-only follows table, target yudtbifopfnjtjanaqrd.
-- Never deploy automatically to production.
create table public.follows (
 follower_id uuid not null references public.profiles(id) on delete cascade,
 following_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,following_id),
 constraint follows_check check(follower_id<>following_id)
);
create index follows_target_idx on public.follows(following_id);
alter table public.follows enable row level security;
revoke all privileges on public.follows from PUBLIC,anon,authenticated;
grant select(follower_id,following_id,created_at) on public.follows to authenticated;
grant insert(follower_id,following_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;
create policy staging_follows_read on public.follows for select to authenticated
 using ((select auth.uid()) is not null);
create policy staging_follows_add_own on public.follows for insert to authenticated
 with check (follower_id=(select auth.uid()));
create policy staging_follows_remove_own on public.follows for delete to authenticated
 using (follower_id=(select auth.uid()));

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
