# Stage 3 club invitations and paid provisioning — STAGING test record (2026-11-02)

## Applied only to Supabase STAGING
1. `stage3_club_invitation_rls_guard`: owner-only pending invitations, invitee-only pending -> accepted/declined; immutable membership identity. UI `SocialGroups.tsx` already calls direct INSERT and UPDATE(status); these now have RLS policies/grant.
2. `stage3_verified_paid_club_provisioner`: dedicated `club_verified_payments` evidence table, no browser/anon access; `staging_provision_paid_club(uuid)` executable only by service_role. Creates club plus one accepted owner membership and marks request paid only if a verified 500 ₽ receipt exists; idempotent by unique source_request_id.

## SQL verification (ALL ROLLBACK)
- Simulated owner sent invitation and simulated invitee accepted: PASS.
- Repeat pending transition denied: PASS.
- Non-owner inviting to another user's club: DENIED.
- Direct insert with accepted membership: DENIED.
- Function grants: anon=false, authenticated=false, service_role=true; receipt insert authenticated=false: PASS.
- Without receipt, provisioning: DENIED.
- With **synthetic, transaction-local** verified receipt, service_role provisioning: PASS.
- Accepted owner membership created: PASS.
- Idempotent second invocation: PASS.

## Not passed / release blockers
- No payment processor/webhook implemented; receipt must be written only after independently validating provider's signed event and paid amount. No real payment accepted or simulated in actual persisted tables.
- Real multi-user JWT/API/browser QA, UI mobile smoke and club admin flow not tested. SQL role simulation is weaker than real JWT tests.
- Security audit of service-role function and verification of security definer owner/search_path in actual deployment.
- No changes to Supabase PROD, no GitHub main merge.
