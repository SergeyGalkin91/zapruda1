# STAGING v0.7.1 security audit — direct EXECUTE grants

2026-11-02. A Supabase Security Advisor scan discovered direct `anon` and `authenticated` EXECUTE grants on six `public.meetup_*` SECURITY DEFINER routines, despite revoking `PUBLIC` execution.

Applied STAGING-only `supabase/staging/20261102_v071_meetup_rpc_grant_hardening.sql`, explicitly revoking direct role grants. Subsequent SQL verification:
- `anon_exec=false` for **all six** meetup helper/trigger functions.
- `authenticated_exec=false` for four trigger functions (member, owner bootstrap, post guard, private details guard).
- `authenticated_exec=true` for `meetup_is_accepted(uuid)` and `meetup_occupancy(uuid)` (required for RLS predicate and client occupancy).
- Advisor no longer reports anonymous EXECUTE on meetup functions; advisor still reports authenticated SECURITY DEFINER helper functions, requiring review as a narrower and intentional contract.
- Advisor's `club_verified_payments` RLS-with-no-policy informational finding is an intentionally internal/service-only table and not a reason to grant client access.

This **does not replace real JWT E2E or concurrency tests**. Do not apply to PROD. CI on exact current SHA must be checked after changes.
