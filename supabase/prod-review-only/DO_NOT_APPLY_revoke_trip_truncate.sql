-- PRODUCTION SECURITY PATCH -- REVIEW ONLY, DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Verified 2026-11-02: anon and authenticated have TRUNCATE on three tables.
-- RLS does NOT protect TRUNCATE. Preserve SELECT/INSERT/UPDATE and existing policies.
begin;
revoke truncate on table
  public.partner_trips,
  public.partner_trip_requests,
  public.partner_trip_messages
from public, anon, authenticated;
-- After approved application, verify via has_table_privilege for each role.
commit;
