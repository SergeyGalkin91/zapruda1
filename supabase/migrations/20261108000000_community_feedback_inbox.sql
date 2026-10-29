-- Admin inbox: cooperation requests and suggestions. No client is allowed
-- to spoof Telegram delivery status, modify others' submissions, or read the inbox.
create table if not exists public.community_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('cooperation','improvement')),
 category text not null check (category in (
   'guide','brand','shop','base','creator','other',
   'feature','bug','ux','ai','safety','other_improvement'
 )),
 subject text not null check (char_length(btrim(subject)) between 5 and 130),
 message text not null check (char_length(btrim(message)) between 20 and 2500),
 contact text not null default '' check (char_length(contact) <= 150),
 created_at timestamptz not null default now(),
 delivery_status text not null default 'pending' check (delivery_status in ('pending','processing','sent','unconfigured','failed')),
 delivery_attempts smallint not null default 0 check (delivery_attempts between 0 and 3),
 delivered_at timestamptz,
 constraint community_feedback_category_kind_check check (
   (kind='cooperation' and category in ('guide','brand','shop','base','creator','other')) or
   (kind='improvement' and category in ('feature','bug','ux','ai','safety','other_improvement'))
 )
);
create index if not exists community_feedback_owner_created_idx on public.community_feedback(user_id,created_at desc);
create index if not exists community_feedback_pending_created_idx on public.community_feedback(delivery_status,created_at);
alter table public.community_feedback enable row level security;
drop policy if exists "Read own submitted feedback" on public.community_feedback;
create policy "Read own submitted feedback" on public.community_feedback
 for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "Create own new feedback" on public.community_feedback;
create policy "Create own new feedback" on public.community_feedback
 for insert to authenticated
 with check (user_id=(select auth.uid()) and delivery_status='pending'
  and delivery_attempts=0 and delivered_at is null);
revoke all on public.community_feedback from anon, authenticated;
grant select on public.community_feedback to authenticated;
grant insert (user_id,kind,category,subject,message,contact)
 on public.community_feedback to authenticated;
-- Prevent flooding even if the client skips form restrictions.
create or replace function public.limit_community_feedback()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if new.user_id is distinct from (select auth.uid()) then
   raise exception 'Feedback must be submitted by the signed-in user';
 end if;
 if (
   select count(*) from public.community_feedback f
   where f.user_id=new.user_id and f.created_at>now()-interval '1 hour'
 ) >= 3 then
   raise exception 'Too many submissions. Try again in an hour.';
 end if;
 return new;
end;
$$;
drop trigger if exists limit_community_feedback on public.community_feedback;
create trigger limit_community_feedback before insert on public.community_feedback
 for each row execute function public.limit_community_feedback();
revoke execute on function public.limit_community_feedback() from public,anon,authenticated;
comment on table public.community_feedback is
 'Private suggestions and partnership requests; users see only their own submissions. Telegram delivery uses a server-side secret.';
