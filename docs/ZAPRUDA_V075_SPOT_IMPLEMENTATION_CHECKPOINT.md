# ZAPRUDA v0.7.5 SPOT — implementation checkpoint
**2026-11-03, STAGING only.** This is an implementation report, **not** production readiness or an E2E signoff.

## Implemented in source
- `src/lib/spot-records.ts`: independent verified single-fish ranking policies for five leagues, KING OF UL and MICRO KING inside a single UL category, TROPHY KING by geographic scope.
- `src/lib/spot-records.test.ts`: ranking/eligibility/method/season/species/key tests.
- `src/lib/approved-spot-map.ts` and `src/lib/approved-spot-map.test.ts`: public-only vetted coordinates; candidate, missing review, invalid coordinates and blank lists produce no map pins.
- `src/components/ZaprudaPublicSpotAtlas.tsx`: read-only public spot catalog/atlas attached under existing team tournaments on `/competitions`, without changing locked navigation.
- `src/integrations/supabase/types.ts`: additive type contract for `zc_public_spots`. No existing team competition fields altered.

## Applied ONLY to Supabase STAGING `yudtbifopfnjtjanaqrd`
- `20261103133135 v075_spot_private_verified_catch_title_engine_staging`: private schema `zc_spot_internal`, tables for catches/evidence/attested scopes/categories/current titles/history/moderation/notification outbox, service-only functions `moderate_catch` and `award_verified_catch`, public `zc_public_spots` with approved-only SELECT policy.
- `20261103134350 v075_spot_private_evidence_bucket_staging`: private `zc-spot-evidence-staging`, max 15 MiB, jpeg/png/webp, no authenticated/anonymous Storage policies for bucket.
- `20261103134513 v075_spot_evidence_private_storage_verification_gate`: moderator/title functions require approved evidence metadata backed by a registered non-deleted object inside the private bucket.

**No schema/Storage changes in production, no seeded real catches or locations, no main merge.**

## Verified
- Initial schema creation in explicit BEGIN/ROLLBACK completed; migration applied to STAGING successfully.
- `supabase/tests/security/v075_spot_rollback_e2e.sql` succeeded after hardening: reject pending catch for crown, reject fake evidence path at moderation, accept once registered private evidence object and scope approved, improve title with a larger verified fish, record history and two deduplicated outbox events. All changes explicitly ROLLBACK.
- After tests: `zc_spot_internal.catches=0`, `title_holders=0`, `zc_public_spots=0`, so **no real approved map pins**.
- `has_table_privilege('anon', private_catches,'SELECT') = false`, `has_function_privilege('authenticated', award,'EXECUTE') = false`, `has_table_privilege('anon', public_spots,'INSERT') = false`.
- A public-map rollback fixture was also inserted/rolled back to check no sample geodata persisted.
- Security Advisor currently reports INFO on internal private tables with RLS ON and no client policies (intentional), and preexisting STAGING WARN on several exposed SECURITY DEFINER helpers and Auth leaked password protection. Those preexisting items are NOT fixed by this implementation.

## Known gaps blocking rollout
1. **Not live end-to-end:** no user-facing catch submission to protected Storage, no server/Edge upload, no vetted moderator role handoff/UI, no actual content inspection and EXIF-free media derivative pipeline. SQL fixtures register fake Storage metadata only inside ROLLBACK to exercise constraints; that does NOT establish uploaded bytes or real photo authenticity.
2. **No real public pin approved yet:** all 20-city candidates need legal/access/geo review; initial six-city shortlist must be verified before publishing any marker.
3. **No atomic title revocation/recalculation or websocket/push delivery worker:** outbox events stored atomically but not delivered. Parallel-transaction race not yet E2E tested from independent sessions.
4. **No authenticated full role E2E** with four confirmed STAGING accounts or production GEO #67 verification. Private positions must remain protected across REST/Storage/SSR/EXIF.
5. Need decide tie policy, historical/season titles, method-specific proof and micro welfare rules. Avoid enabling title award from untrusted client or pretending verified proof is automatic.
6. `v0.7.1` remains current base version in package.json. **Do not release v0.7.5** until implementation and acceptance complete.

## CI
GitHub Actions quality results must be evaluated on the **exact current HEAD**. Prior commits failed lint formatting in new files; corrected incrementally without disabling lint. Final typecheck/test/build only mark PASS upon observed workflow result.

## Scope boundaries
The existing team competitions and their fish_count/total_weight_g are unchanged and not repurposed. SPOT MARKET, payment entitlements and payouts remain future separate work. Design v0.6.0-admin-rc.1 and Matte Black/Electric Blue theme choices preserved.
