# ZAPRUDA v0.7.1 — СХОДКИ STAGING QA, 2026-11-02

## Implementation delivered in PR #60
- `src/components/SocialMeetups.tsx` rendered on `/communities`.
- Country / region / city exact filters, no unfiltered public listing. Create announcement, join pending, owner accept/decline, private chat.
- STAGING DDL is kept in `supabase/staging/20261102_v071_meetups_DRAFT_REVIEW_BEFORE_APPLY.sql` (historic filename; now **APPLIED ON STAGING** after BEGIN/ROLLBACK validation and grant/function signature corrections). This filename must never be confused with a migration applied on PROD.
- Tables: `meetup_posts`, `meetup_members`, `meetup_private_details`, `meetup_messages`. Parent-row FOR UPDATE before 3-seat acceptance ensures serialized membership acceptance. Owner bootstrap creates the first accepted seat.
- Exact coordinates and meeting time only in `meetup_private_details`, readable via RLS only by accepted members. Public listing has only country/region/city.
- `meetup_occupancy` returns only accepted count and cannot disclose member identities.

## Executed checks
1. Full DDL executed inside BEGIN/ROLLBACK on STAGING: PASS after correcting a wrong helper-function GRANT signature.
2. Same schema executed in BEGIN/COMMIT on **STAGING project `yudtbifopfnjtjanaqrd` only**: PASS.
3. Read-only catalog: all four tables have RLS enabled, `anon` has no SELECT privilege: PASS.
4. Occupancy helper installed on STAGING: PASS.
5. GitHub CI on exact PR #60 HEAD: check separately.

## STILL REQUIRED (release blockers)
- Two or more real user JWT/browser sessions: post creation, join, owner accept, private-message visibility before/after acceptance and fourth member rejected.
- Concurrent two-acceptances for the third seat; verify exactly 3 accepted, never 4.
- Role matrix: anonymous, nonmember, pending, accepted, organizer, administrator; test location/private messages in actual PostgREST.
- Validate mobile 320, 375, 430 px and desktop, keyboard and network errors.
- Review any role-trigger SQL under true JWT, not just database role simulation.
- Payment integration for clubs/guides and coordinated Grok PRs #56–#59 are separate gates.
- Release remains **NOT PUBLISHED**; no `main` or PROD mutation.

Grok assignment: issue #61. Release integration: draft PR #60.
