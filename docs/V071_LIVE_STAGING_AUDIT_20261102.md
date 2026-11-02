# v0.7.1 live STAGING audit — 2026-11-02

Project: `yudtbifopfnjtjanaqrd` (STAGING exclusively). PR #60. No production/main changes.

## Verified by live Supabase connector (read-only)
- Project ACTIVE_HEALTHY.
- 2 auth users; 0 meetup posts; 0 meetup members at time of check.
- All four `meetup_*` tables have RLS enabled.
- `anon` has no table SELECT on posts, members, messages, or private details.
- `authenticated` has SELECT grants; per-row visibility requires independent JWT/PostgREST test.
- Security advisor flags callable SECURITY DEFINER functions `meetup_is_accepted`, `meetup_occupancy`, and `my_profile_full`. These are warnings requiring review, not proven data exposure.
- Additional separate warnings: leaked-password protection disabled, and no policy on `club_verified_payments` (INFO).

## Real JWT E2E NOT executed
- Protected credentials for four disposable verified STAGING users not available.
- GitHub connector exposed no workflow_dispatch / secret configuration action. The manual workflow exists at `.github/workflows/v071-meetup-real-jwt-e2e.yml` but has not been invoked.
- Direct terminal network DNS lookup to STAGING endpoint failed in this execution environment.
- Do not manufacture accounts by writing directly to `auth.users`. Configure disposable identities through supported Supabase Auth APIs, email verification and the protected `staging-e2e` GitHub environment.
- Use preconfigured secrets documented by workflow; trigger it manually from Actions on the integration branch.
- Once run, record the run URL, SHA, assertion outcomes, and explicit disposable fixture cleanup evidence.

## Gate
PR #60 remains DRAFT / NOT RELEASED. Never claim real-JWT authorization or parallel capacity race is passed from static guard, read-only database metadata, or simulated SQL roles.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
