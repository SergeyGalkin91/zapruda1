-- STAGING only. Existing policies mistakenly correlated m.group_id to itself.
-- Preserve existing grants, sender ownership, accepted status and RLS on membership.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='social_group_messages'
      and permissive='PERMISSIVE' and cmd in ('ALL','SELECT','INSERT')
      and policyname not in ('group_msg_read','group_msg_insert')
  ) then
    raise exception 'CLUB_MESSAGE_UNREVIEWED_PERMISSIVE_POLICY';
  end if;
end $$;

alter policy group_msg_read on public.social_group_messages
to authenticated
using (exists (
  select 1 from public.social_group_members m
  where m.group_id = social_group_messages.group_id
    and m.user_id = (select auth.uid()) and m.status = 'accepted'
));

alter policy group_msg_insert on public.social_group_messages
to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.social_group_members m
    where m.group_id = social_group_messages.group_id
      and m.user_id = (select auth.uid()) and m.status = 'accepted'
  )
);
