-- Private user feedback and partnership enquiries for ZAPRUDA admin inbox.
create table if not exists public.admin_inbox_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('collaboration','improvement')),
  subject text not null check (char_length(btrim(subject)) between 5 and 120),
  body text not null check (char_length(btrim(body)) between 20 and 3000),
  contact text not null default '' check (char_length(contact) <= 160),
  company text not null default '' check (char_length(company) <= 160),
  consent_to_contact boolean not null default false,
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued','sent','failed')),
  created_at timestamptz not null default now()
);
create index if not exists admin_inbox_submissions_user_created_idx
 on public.admin_inbox_submissions(user_id,created_at desc);
alter table public.admin_inbox_submissions enable row level security;
drop policy if exists "Submitter reads own requests" on public.admin_inbox_submissions;
create policy "Submitter reads own requests" on public.admin_inbox_submissions
 for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Submitter writes new requests" on public.admin_inbox_submissions;
create policy "Submitter writes new requests" on public.admin_inbox_submissions
 for insert to authenticated with check (
   user_id = (select auth.uid()) and delivery_status='queued'
   and (category = 'improvement' or consent_to_contact)
 );
revoke all on public.admin_inbox_submissions from anon, authenticated;
grant select, insert on public.admin_inbox_submissions to authenticated;

-- Rate-limiting is executed by Postgres and applies to requests regardless
-- of whether a client uses the React form or calls REST directly.
create or replace function public.limit_admin_inbox_submissions()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
 recent_count integer;
 day_count integer;
begin
 if new.created_at is distinct from now() then
   -- users cannot backdate requests to evade throttling
   new.created_at := now();
 end if;
 if new.user_id <> (select auth.uid()) then
   raise exception 'Not authorized';
 end if;
 -- Serialize submissions by user to prevent concurrent requests bypassing limit.
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 742901));
 select count(*) into recent_count from public.admin_inbox_submissions
  where user_id = new.user_id and created_at > now() - interval '90 seconds';
 select count(*) into day_count from public.admin_inbox_submissions
  where user_id = new.user_id and created_at > now() - interval '24 hours';
 if recent_count >= 1 or day_count >= 5 then
   raise exception 'Too many submissions; please try again later';
 end if;
 return new;
end;
$$;
revoke all on function public.limit_admin_inbox_submissions() from public,anon,authenticated;
drop trigger if exists limit_admin_inbox_submissions on public.admin_inbox_submissions;
create trigger limit_admin_inbox_submissions before insert
 on public.admin_inbox_submissions for each row
 execute function public.limit_admin_inbox_submissions();
comment on table public.admin_inbox_submissions is
 'Private user-authored collaboration requests and feature feedback; user reads own, service backend handles Telegram delivery.';
