-- Server-managed administrator roster and private review of user feedback.
create table if not exists public.zapruda_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.zapruda_admins enable row level security;
revoke all on public.zapruda_admins from anon, authenticated;
grant select on public.zapruda_admins to authenticated;
drop policy if exists "Admins can confirm own membership" on public.zapruda_admins;
create policy "Admins can confirm own membership"
 on public.zapruda_admins for select to authenticated
 using (user_id = (select auth.uid()));
-- Only a trusted server/service operation can assign an administrator.
create schema if not exists zapruda_internal;
create or replace function zapruda_internal.is_zapruda_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.zapruda_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function zapruda_internal.is_zapruda_admin() from public, anon;
grant usage on schema zapruda_internal to authenticated;
grant execute on function zapruda_internal.is_zapruda_admin() to authenticated;

drop policy if exists "Administrators review feedback" on public.community_requests;
create policy "Administrators review feedback" on public.community_requests
 for select to authenticated using (zapruda_internal.is_zapruda_admin());

comment on table public.zapruda_admins is 'Explicit administrator grants. No public or client writes allowed.';
