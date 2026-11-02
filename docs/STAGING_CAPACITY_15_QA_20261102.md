# QA report: 15-seat clubs and trip table privileges (2026-11-02)

## Executed on STAGING only
- Existing trigger `trg_stage_club_capacity_15` confirmed installed.
- Ran BEGIN / DO ... / ROLLBACK using 16 synthetic auth.users created inside rollback transaction. Inserted one temporary group and 15 pending members; 16th pending-member insert returned check_violation (caught by test). Assertion 15 members AND 16th rejection passed. Transaction rolled back. No persisted test identities or memberships.
- First attempt without matching auth.users failed correctly on FK constraint (expected database integrity).
- **Concurrency not demonstrated**: execute two independent sessions against one group at 14 seats, simultaneous INSERT to confirm lock behaviour. Sequential SQL test does NOT prove concurrent behaviour.
- Club payment confirmation and admin approval not tested; no simulated payments.

## Confirmed read-only in PROD
- On partner_trips, partner_trip_requests and partner_trip_messages, both anon and authenticated show has_table_privilege(...,'TRUNCATE')=true. Risk confirmed: RLS doesn't govern TRUNCATE.
- Patch `supabase/prod-review-only/DO_NOT_APPLY_revoke_trip_truncate.sql` is NOT APPLIED. Requires explicit production approval, deployment window and rollback plan. Check grants inherited from PUBLIC and post-apply has_table_privilege.
- No production writes.

## Release blockers
- Independent simultaneous transactions to test 15/16.
- Real JWT user/admin access and complete club payment creation/confirmation.
- No merge to main or release until tested and approved.
