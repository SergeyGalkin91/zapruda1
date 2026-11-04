-- STAGING only: the meetup foundation is not part of the generic migration chain.
-- Requires all four meetup tables and their existing RLS policies.
-- Remove inherited broad defaults; do not change RLS, rows, Auth or role membership.
revoke all on public.meetup_posts,public.meetup_members,
  public.meetup_private_details,public.meetup_messages from anon,authenticated;
grant select,insert,update on public.meetup_posts,public.meetup_members,
  public.meetup_private_details to authenticated;
grant select,insert on public.meetup_messages to authenticated;
