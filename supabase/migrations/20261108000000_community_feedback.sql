-- ZAPRUDA: authenticated requests for partnerships and product improvements.
-- All requests remain private: never expose customer contact data in public feeds.
create table if not exists public.community_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('collaboration','improvement')),
  subject text not null check (char_length(btrim(subject)) between 5 and 140),
  message text not null check (char_length(btrim(message)) between 20 and 3000),
  contact text not null default '' check (char_length(contact) <= 180),
  created_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new','reviewing','closed')),
  telegram_status text not null default 'pending'
    check (telegram_status in ('pending','sent','error'))
);
create index if not exists community_feedback_owner_created_idx
  on public.community_feedback(user_id,created_at desc);
alter table public.community_feedback enable row level security;
revoke all on public.community_feedback from anon,authenticated;
grant select,insert on public.community_feedback to authenticated;

drop policy if exists "Authors view their requests" on public.community_feedback;
create policy "Authors view their requests" on public.community_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Authors submit requests" on public.community_feedback;
create policy "Authors submit requests" on public.community_feedback
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'new'
    and telegram_status = 'pending'
  );

-- Prevent bot spam at the database layer, including direct API submissions.
-- Lock the user row to serialize submissions from the same account.
create or replace function public.guard_feedback_submission()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
 hourly_count bigint;
 daily_count bigint;
begin
 if (select auth.uid()) is null or new.user_id <> (select auth.uid()) then
   raise exception 'Authentication required';
 end if;
 perform 1 from public.profiles where id = new.user_id for update;
 select count(*) into hourly_count from public.community_feedback f
 where f.user_id = new.user_id and f.created_at > now() - interval '1 hour';
 select count(*) into daily_count from public.community_feedback f
 where f.user_id = new.user_id and f.created_at > now() - interval '24 hours';
 if hourly_count >= 3 or daily_count >= 10 then
   raise exception 'Feedback rate limit exceeded';
 end if;
 return new;
end;
$$;
drop trigger if exists guard_feedback_submission on public.community_feedback;
create trigger guard_feedback_submission
 before insert on public.community_feedback
 for each row execute function public.guard_feedback_submission();
revoke execute on function public.guard_feedback_submission() from public,anon;

comment on table public.community_feedback is
  'Private partnership and app improvement requests; notifications via authenticated server-side Edge Function. Telegram credentials never go to clients.';
