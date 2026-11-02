-- REVIEW ONLY. Production privileges verified read-only 2026-11-02.
-- DO NOT APPLY TO PROD without explicit owner approval and rollout review.
-- RLS does not protect TRUNCATE. Keep all other privileges unchanged.
revoke truncate on table
 public.partner_trips,
 public.partner_trip_requests,
 public.partner_trip_messages
from public, anon, authenticated;

-- Verification query (read-only):
-- select c.relname,
--   has_table_privilege('anon',c.oid,'TRUNCATE') anon_truncate,
--   has_table_privilege('authenticated',c.oid,'TRUNCATE') auth_truncate
-- from pg_class c join pg_namespace n on n.oid=c.relnamespace
-- where n.nspname='public'
--   and c.relname in ('partner_trips','partner_trip_requests','partner_trip_messages');
--
-- Other grants and RLS policies require separate audit; this change is surgical.
