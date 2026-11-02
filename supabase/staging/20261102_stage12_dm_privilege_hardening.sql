-- STAGING only. Remove inherited broad Data API privileges: RLS does NOT control TRUNCATE.
revoke all privileges on table public.social_threads, public.social_messages, public.social_message_reactions from public, anon, authenticated;
grant select, insert on public.social_threads to authenticated;
grant update (status) on public.social_threads to authenticated;
grant select, insert on public.social_messages to authenticated;
grant select, insert, delete on public.social_message_reactions to authenticated;
