# STAGING report dependencies — applied + independently checked, 2026-11-04

## Scope and environment
- ONLY Supabase project **`yudtbifopfnjtjanaqrd`** (ZAPRUDA STAGING).
- Production **`sonvniuwtvzzyuglscah`**, main, original Netlify/Lovable, official domain: **UNTOUCHED**.
- This patch is deliberately stored in `qa/staging/`, **not** the production auto-migration directory.
- Migration history applied through Supabase:
  - `staging_minimal_report_dependencies_20261104`
  - `staging_minimal_report_restrict_inherited_grants_20261104`
- The canonical re-playable patch in this branch contains **both** schema and least-privilege grant fixes.

## Verified, not inferred
- Before: `to_regclass('public.catches')` and `to_regclass('public.comments')` both NULL.
- After: `public.catches` and `public.comments` exist.
- Both have `relrowsecurity = true`; each has 2 explicit policies (4 total).
- Both are empty: 0 catches and 0 comments; no test/public catch or user was manufactured.
- `anon` may SELECT `catches.id` but cannot INSERT into `catches`.
- `authenticated` has column INSERT for catch fields, constrained to ownership of underlying `fishing_reports`.
- `catches.photo_url` is **NOT selectable** by `anon` or `authenticated`. The gateway remains the sanctioned photo transport.
- `authenticated` has no DELETE on comments.
- Comment insertion is limited to public reports and `auth.uid() = user_id`; comments/catches on private reports are visible only to report owner.
- Manual security advisor check was executed post-change. Existing unrelated 11 RLS-no-policy and 11 security-definer warnings remain; no new missing-policy finding for these two tables.

## Unexpected issue caught and remediated during verification
Supabase project default table privileges made even unintended broad operations accessible after initial `CREATE TABLE` and column `GRANT`. Follow-up migration **revoked `ALL` on the two tables from PUBLIC/anon/authenticated** and then re-granted only required per-column SELECT/INSERT. Current ACL is verified restrictive. The repository patch includes the fix in correct creation order.

## Remaining gates
- Live signed-JWT owner/stranger/guest E2E for catches/comments and comment Realtime are **NOT YET PROVEN**. Simulated SQL grants/ACL checks are not substitutes.
- The report wizard's optional Atlas and the public chat still have missing STAGING tables. No positive full-app STAGING acceptance is asserted.
- Work's 22 table gap list is expected to be reduced by **2** (22 → 20) for these direct objects; re-run full inventory for an authoritative up-to-date count.
- Existing full SPOT KING workflow and Yandex provider are unrelated and remain blocked at their own gates.

## Follow-up live test
Use a real signed user JWT against the isolated STAGING REST Data API and test (1) own report catch insert, (2) another user's report denied, (3) private report catches hidden from guest/stranger, (4) public report comments visible, (5) private report comments hidden, (6) photo_url cannot be read, (7) cleanup of only self-created fixtures. Never paste JWTs or credentials into issues.
