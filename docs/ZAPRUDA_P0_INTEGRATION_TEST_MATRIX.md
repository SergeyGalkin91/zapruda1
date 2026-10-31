# ZAPRUDA P0 integration verification matrix
Branch: integration/p0-admin-beta-rc1; PR #10. Design: v0.6.0-admin-rc.1 LOCKED.
Do not merge main, deploy, or mutate production Supabase from this document.

## CI (required)
- Frontend Build (compile + mobile 320/375/430px route and Street Fishing reload) green on exact integration HEAD.
- ZAPRUDA checks green on exact integration HEAD.
- Verify generated route tree contains /admin and /admin/operations.
- If checks do not appear, investigate GitHub workflows/permissions rather than claiming success from PR #7 alone.

## Browser and server-role E2E (NOT YET VERIFIED)
- Account A register/confirm/login, profile save -> F5 -> fields remain.
- Account B cannot update A profile/angler_preferences.
- A requests a DM with B; pending cannot send; B accepts; both can send; unrelated account C denied read/insert to thread.
- Unaccepted club invite cannot read/write group messages; accepted member can.
- Non-admin denied finance summary, club payment confirmation and admin select; admin can only perform authorized actions.
- On staging only: confirm an approved unpaid club request with synthetic payment reference and verify exactly one social_groups.source_request_id / one owner membership.
- Legacy activate_paid_club remains a known blocker: review security PR #11, test revoke in staging, and apply only with owner authorization.
- Finance: distinguish administratively confirmed reference vs settled provider payment.

## Merge blockers
CI or live authorization failures, legacy RPC duplicate path, unintended UI visual regression, missing tests under actual authenticated JWTs.