-- ZAPRUDA P0 security proposal — NOT APPLIED to any database.
-- Precondition: ensure all clients use confirm_club_creation_payment trigger flow.
-- This file must be reviewed and tested in staging before any production deployment.
-- Legacy public.activate_paid_club() creates social_groups without source_request_id.
-- The current owner-only check does NOT protect against duplicate activation via this separate path.

BEGIN;
REVOKE EXECUTE ON FUNCTION public.activate_paid_club(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_paid_club(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_paid_club(uuid) FROM authenticated;
COMMIT;

-- Staging verification using a real authenticated JWT:
-- SELECT has_function_privilege('authenticated', 'public.activate_paid_club(uuid)', 'EXECUTE'); -- expected false
-- Expect calling public.activate_paid_club(uuid) as authenticated to fail with permission denied.
-- Ensure public.confirm_club_creation_payment(uuid,text) remains admin-only by its internal auth.uid() check.
-- Confirm an approved awaiting_payment request generates exactly one social_groups row with source_request_id after controlled admin confirmation; never use real payments for tests.

-- Emergency rollback requires explicit independent approval, and restores a vulnerable path:
-- GRANT EXECUTE ON FUNCTION public.activate_paid_club(uuid) TO authenticated;