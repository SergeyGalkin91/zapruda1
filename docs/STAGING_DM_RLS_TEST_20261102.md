# STAGING DM RLS test — 2026-11-02

Target: Supabase STAGING yudtbifopfnjtjanaqrd. **No production changes.**

## SQL role simulation — PASSED
Used BEGIN; SET LOCAL ROLE authenticated; auth.uid() simulated via transaction-local request.jwt.claim.sub for two existing STAGING auth accounts and one synthetic outsider identifier. Transaction rolled back. No account emails, tokens, message contents or UUIDs retained in this report.

Assertions passed:
1. Requester can insert and SELECT pending thread.
2. Outsider SELECT on thread returns zero.
3. Recipient can UPDATE status to accepted.
4. Requester can INSERT text message and 🎣 reaction; can read reaction.
5. Recipient can SELECT text message and reaction.
6. Outsider SELECT returns zero for messages and reactions.

After ROLLBACK: threads=0, messages=0, reactions=0.

## NOT YET VERIFIED
- Three genuinely signed-in independent JWT sessions over Supabase Data API / browser.
- Rejection of unauthorized INSERT, spoofed sender, update status spoofing, duplicate invitations, concurrent reactions and Realtime.
- GPS sharing: intentionally not implemented in STAGING and must not be treated as available.
- Paid clubs: STAGING has no social_group_members, social_groups, club_creation_requests and payment pipeline yet. **Do not apply PR #49 migration to STAGING without restoring dependencies**. PR #49 count-based trigger has race under concurrent insert and may conflict with existing production trigger; needs concurrency-safe per-group locking, clear pending-invitation semantics, GRANT/RLS audit, payment confirmation test. No payments or production changes made.

## Release gate
Keep PR #52 Draft until real JWT and browser QA. Keep club PR #49 Draft until dependency migration and concurrency-safe 15-person server constraint verified.
