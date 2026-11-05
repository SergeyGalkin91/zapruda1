-- Disconnected fixture of the SELECT/INSERT policies observed on STAGING 2026-11-04.
-- Never apply this historical vulnerable fixture to a hosted project.
create table public.social_groups(id uuid primary key default gen_random_uuid(), name text,
  owner_id uuid references auth.users(id));
create table public.social_group_members(group_id uuid references public.social_groups(id),
  user_id uuid references auth.users(id), role text default 'member', status text,
  primary key(group_id,user_id));
create table public.social_group_messages(id uuid primary key default gen_random_uuid(),
  group_id uuid references public.social_groups(id), user_id uuid references auth.users(id),
  body text not null, created_at timestamptz default now());
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.social_group_messages enable row level security;
revoke all on public.social_groups,public.social_group_members,public.social_group_messages from anon;
grant select on public.social_groups,public.social_group_members,public.social_group_messages to authenticated;
grant insert on public.social_group_messages to authenticated;
create policy group_view on public.social_groups for select to authenticated using(true);
create policy member_view on public.social_group_members for select to authenticated using (
  user_id=(select auth.uid()) or exists(select 1 from public.social_groups g
    where g.id=social_group_members.group_id and g.owner_id=(select auth.uid()))
);
create policy group_msg_read on public.social_group_messages for select to authenticated using (
  exists(select 1 from public.social_group_members m where m.group_id=m.group_id
    and m.user_id=(select auth.uid()) and m.status='accepted')
);
create policy group_msg_insert on public.social_group_messages for insert to authenticated with check (
  user_id=(select auth.uid()) and exists(select 1 from public.social_group_members m
    where m.group_id=m.group_id and m.user_id=(select auth.uid()) and m.status='accepted')
);
