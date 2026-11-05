# STAGING club provisioning + invitations QA — 2026-11-02

## Applied migration
`stage3_club_invites_provision` on project `yudtbifopfnjtjanaqrd`.
SQL: `supabase/staging/20261102_stage3_club_invites_provision.sql`.

Server-only `public.provision_verified_paid_club(uuid)`: service-role EXECUTE only, gated on `paid`, `admin_approved=true`, nonblank payment reference. Atomic and idempotent group creation by unique `source_request_id`; automatic owner accepted membership. External payment verification **NOT IMPLEMENTED**: trusted backend must verify provider transaction first before setting fields. No real payments performed.

Club invitation RLS: club owner may INSERT pending invite for someone else; invited user only may UPDATE(status) to accepted/declined; immutable identifiers/role safeguarded by transition trigger. Existing capacity-15 trigger continues protecting pending+accepted slots.

## SQL test — PASS with rollback
Simulated service_role creation from fixture with *fictional paid status*, then two independent authenticated identities as owner and invitee, then outsider. Verified server creation, owner enrollment, idempotent provisioning, invite, acceptance, club message INSERT, outsider SELECT=0. ROLLBACK completed; post-query: groups=0, memberships=0, requests=0.

Verified DB privileges:
- `authenticated` can EXECUTE provision: false
- `anon` can EXECUTE provision: false
- `service_role` can EXECUTE provision: true
- `authenticated` can UPDATE club_creation_requests: false
- `authenticated` can UPDATE membership status: true, subject to RLS and trigger.

## Still blocking release
- Real payment provider webhooks with signature verification, replay handling, receipt lookup, amount/currency validation, and only server-authorized payment confirmation.
- Actual browser/API JWT E2E, outsider denial of INSERT/UPDATE, decline/duplicate invite, member capacity under repeated parallel traffic.
- Confirm Netlify Preview targets STAGING and latest frontend uses exact schema.
- Do not merge to main or apply PROD without separate owner approval.
