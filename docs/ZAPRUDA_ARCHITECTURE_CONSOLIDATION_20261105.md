# Architecture consolidation — 05.11.2026

Target: **0.7.6 KING FINISH ON SPOT+**, technical package remains 0.7.5. Source: code9c7fe6e, canonical specification a6ded87/D22. The latest owner asks for one screen/transition map, a dependency inventory, a continuous catch → BIG FISH → independent review → title → profile journey, and integration with the existing Premium UI. Main/Production remain prohibited. No previously working module is being rewritten or removed.

## Read-only findings before edits

[Complete branch/PR inventory](../qa/architecture-20261105/BRANCH_PR_INVENTORY.md), [machine-readable snapshot](../qa/architecture-20261105/branch-pr-inventory.json):95 remote branches,75 open PRs,4 groups sharing a head. Unique patches, equivalent patches, ancestor status and PR targets are recorded. No branch/PR deletion, retarget, merge, history rewrite, or old migration replay is authorized by an inventory result.

Confirmed breaks on9c7fe6e:
- `reports.new.tsx` saves the real report/catches atomically, then returns to feed without a BIG FISH transition.
- `SpotCatchFlow` already implements upload/status/review/revoke against the existing Edge gateway; it is buried at the end of competitions. Reuse it instead of making another catch system.
- The profile displays activity/XP, but no server-authoritative current KING titles or title history. `public.zc_spot_my_progress()` does not exist in actual STAGING.
- The SPOT gateway shadows the global URL constructor with its backend URL string; every non-null browser Origin is rejected. Its allowlist also omits immutable owned Netlify deployments. Its JWT, independent moderator and evidence guards must remain.
- ON SPOT+ is approved mandatory scope OSP-01…09, but has no membership/presence/invitation backend in STAGING. Existing country/geographic chat is not a moderated waterside-zone membership system. Do not rename it and claim those gates passed.

## Implementation boundary / security design before schema edits

1. Keep existing report persistence/idempotency/photo processing and existing SPOT catch/review/revoke APIs. Add explicit navigation and a short-lived, account-scoped, optional handoff of **one** selected fish's species/weight/length. Never copy coordinates, original photos, evidence keys, authentication values or a `verified` claim. The user must select a lawful reviewed SPOT, actual time and private proof independently; no automatic record submission or title.
2. Add one read-only no-argument owner progress RPC in STAGING. SECURITY DEFINER is necessary because private SPOT tables intentionally cannot be read by a browser. It must use a fixed search_path, require a confirmed non-anonymous current Auth user, restrict every catch/title/history row to that user, return only allowlisted fields, limit results and revoke PUBLIC/anon EXECUTE. No caller-supplied user ID or authorization from user_metadata. No new title-award logic, table grants, RLS relaxation or original-evidence exposure.
3. Profile crowns come only from current server title_holders joined to a lawful verified owned catch and approved evidence/scope. Activity XP and report counts never create a KING. Revocation/re-election must be reflected by a fresh authoritative read. History must disclose only the current user's events, not another fisher's private catch or location.
4. Preserve gateway JWT verification and user-scoped RPCs. Allow only the existing site’s HTTPS deploy-preview/24-hex immutable hosts plus explicit loopback development origins; reject other projects, suffix tricks, opaque origins and Production deployment of this STAGING-only gateway.
5. ON SPOT+ entry may provide honest existing-catalog/empty/denied navigation, but OSP-01…09 remain PARTIAL/BLOCKED until zone policy, opt-in membership, independent presence consent/TTL, block/privacy controls, mutual invites, inbox/rate limits and group-photo consent are genuinely implemented and accepted. No passive geolocation, fabricated presence, fake local groups or duplicate chat schema.

## Verification and genuine blockers

Local SQL fixtures/role simulation and mocked component tests are isolated technical regressions, not signed JWT E2E. Real JWT tests must use existing protected STAGING accounts, preserve secret boundaries, reject unapproved catches/unauthorized review, prove owner-only progress reads and report all positive KING gaps explicitly.

Actual STAGING inventory at start:0 moderators,0 approved public SPOT,0 private SPOT catches/evidence/title holders. A genuine positive catch→independent review→KING→profile flow needs an owner-authorized independent moderator, a real lawful approved SPOT and genuine evidence. Do not assign roles, fabricate locations/catches, use SQL fixtures as JWT proof, or mark the whole release accepted. Existing feedback fixtures from previous runs are outside this work's cleanup boundary.

All56 legacy IDs/8 modules/7 KING and OSP-01…09 remain obligations. This architecture work does not defer them, approve a release, alter main/Production/DNS/payments, or bump a version. Final code/evidence/statuses are appended after verification.

## Implemented delta (verification candidate)

- Added `/big-fish`, explicit post-report one-fish handoff and return paths to real server review/status/profile. Existing persistence, evidence, review/revoke and idempotency engines remain.
- Added profile own progress with actual statuses, authoritative current crowns and own title history; stale/pending/unlawful/missing-evidence catches cannot appear as current crowns.
- Applied only new STAGING RPC migration `20261105000601_v076_owned_spot_progress`; isolated SQL/rollback9 PASS. No table grants or RLS changes.
- Deployed only STAGING `zapruda-spot-records` v12 with verify_jwt=true; corrected URL shadowing, strict owned preview origins and STAGING-only project fence. Legacy v11 source was captured before replacement.
- Added `/on-spot` entry and links without false membership/presence implementation. Full OSP-01…09 remain P0 open.
- Local TypeScript, build, Deno exact gateway imports and483 Vitest tests PASS. ESLint has no errors; baseline fast-refresh warnings remain. Ordinary CI and protected real JWT/browser evidence for the published candidate are pending until actual runs complete.
- New scoped protected architecture workflow reuses existing live SPOT and browser suites; excludes pre-existing feedback fixture set and does not consume model quotas. Positive KING remains blocked by genuine prerequisites.

STAGING isolation: the new SQL delta is stored in `supabase/staging/20261105000601_v076_owned_spot_progress.sql`, outside automatic Production migrations. An isolated regression checks that no copy exists in `supabase/migrations`; the already deployed RPC body and Edge sources are unchanged.
