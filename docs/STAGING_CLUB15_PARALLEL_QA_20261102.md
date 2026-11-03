# STAGING club 15-seat concurrent test — 2026-11-02

Target: Supabase STAGING `yudtbifopfnjtjanaqrd` only.

## Procedure and result
- Created an isolated temporary QA club and 14 distinct synthetic pending members on STAGING. Existing authenticated identities served as contenders; no real account data changed beyond temporary membership records.
- Submitted two `INSERT` statements for the final slot via two concurrently awaited database SQL calls.
- Outcome: contender 1 INSERT accepted, contender 2 rejected with PostgreSQL **23514 CLUB_MEMBER_LIMIT**.
- Count following both calls: **15 occupied**, not 16.
- Explicit transaction deleted QA memberships, QA club, and synthetic `auth.users`; independent SELECT verified **clubs_left=0, members_left=0, test_users_left=0**.

## Scope of evidence
This is a two-call SQL concurrency test, not independent signed-in API JWT sessions, real-time race stress test, or formal proof for every transaction isolation level. It exercises the current trigger using the actual staging database. No production writes.

## Remaining gates
- Real authenticated browser/API workflows including invites, membership acceptance, owner role and 500 ₽ server-side payment acknowledgment.
- Verify user-invitation and club owner membership policies; test 14→15 and 16 under load; consider triggers on owner removal and updates.
- CI and release approval. No merge to main.
