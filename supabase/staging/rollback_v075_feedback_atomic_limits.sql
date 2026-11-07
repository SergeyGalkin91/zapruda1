-- STAGING-only metadata rollback; stop the v2 broker first. No records removed.
drop function public.submit_community_request_v075(uuid,text,text,text,text,text);
revoke select(user_id) on public.community_requests from authenticated;
-- The owner policy, private data, prior read columns and direct-write denial stay.
