# ZAPRUDA — production readiness, read-only 04.11.2026

**NOT AUTHORIZATION TO APPLY. NO-GO.** Projects: STAGING yudtbifopfnjtjanaqrd; production sonvniuwtvzzyuglscah. [Machine-readable exact diff](../qa/product-contract/SCHEMA_DIFF_20261104_P0.json) covers public, storage, zapruda_internal and zc_spot_internal: table/view definitions metadata, columns/defaults/column ACL, constraints, indexes, policies, function signatures/body fingerprints/ACL/search_path, triggers, table grants, buckets and Realtime publication. No private row contents, credentials or function bodies copied. MD5 is an identity fingerprint, not a security signature. Managed Auth internals and secret values are outside this snapshot.

## Confirmed differences

| Catalog | STAGING | Production | Only STAGING / only production / changed same key |
|---|---:|---:|---:|
| Tables/views | 72 | 72 | 24 / 24 / 1 |
| Columns | 574 | 593 | 174 / 193 / 98 |
| Constraints | 372 | 424 | 144 / 196 / 31 |
| Policies | 139 | 170 | 133 / 164 / 3 |
| Functions | 74 | 56 | 49 / 31 / 3 |
| Triggers | 32 | 30 | 23 / 21 / 0 |
| Relation-role grants | 216 | 216 | 72 / 72 / 48 |
| Indexes | 158 | 198 | 66 / 106 / 1 |
| Buckets | 4 | 5 | 2 / 3 / 2 |
| Realtime entries | 4 | 5 | 3 / 4 / 0 |

Policy identity includes its name; renamed policies appear as two differences, not proof of two missing behaviors. Do not mirror STAGING wholesale: production-only objects include Auth/provider/guide/admin/AI/session/review features that must be preserved. Differences inside managed storage internals require vendor/version assessment, not application migrations.

Production lacks **chat_read_state, mark_chat_read, chat_room_read_summary, publish_report_with_catches and its private receipt table**, meetup foundation and SPOT internal schema. Matching function names can still differ: ensure_chat_place and set_my_primary_gear_set have different definition fingerprints. Production migration history ends **20261101204210**; STAGING includes later pilot/privacy/SPOT/Atlas and the two new security deltas. Histories were created independently; migration version ordering is not an automatic replay recipe.

**Confirmed ACL blockers:** production fishing_reports latitude/longitude are SELECT-granted to anon/authenticated; STAGING denies both. Production report_photos lacks sanitized_path and related sanitized metadata; its public-photo policy and Storage public-report path differ from STAGING's sanitized derivative gate. Read-only aggregate: **5 public reports, 0 with stored exact coordinates; 1 report-photo row and 1 legacy report-photos object**. No current GPS leak or EXIF safety conclusion follows from those counts. Existing legacy media needs a private inventory and sanitization/compatibility treatment before rollout.

Production retains TRUNCATE grants to anon/authenticated on multiple application relations (including fishing_reports/chat/comments/partner_trips). RLS does not control TRUNCATE. This is a privilege-hardening blocker requiring a reviewed production-specific delta and approval, not a destructive test on production.

STAGING buckets: avatars public, chat-photos private JPEG-only, report-photo-derivatives private JPEG-only, zc-spot-evidence-staging private. Production additionally has report-photos, fishing-map-photos and guide-verification-private; derivative/evidence staging buckets are absent. Keep legitimate production buckets, paths and evidence; never copy the staging-named evidence bucket blindly.

Edge metadata is included in the diff. Production has **no report-photo-upload/access, chat-photo-upload/access, openweather-current, zapruda-spot-records or Yandex canary** under the tested names. submit-community-request and zapruda-daily-advice have different deployed hashes; verify_jwt=false alone is not proof of unauthenticated access (handler checks must be reviewed). Production-only feedback/Telegram/admin/email functions are preserved; external delivery must stay out of acceptance tests.

No environment secret values read or copied. Required names must be checked in the deployment control plane without revealing values: Supabase URL/public key, server Supabase/service-role binding used only inside authorized Edge handlers, actual weather/provider settings, existing delivery toggles. Yandex route remains an unaccepted canary; do not cut over based on function presence or manufacture quota. Actual availability of production env bindings is **UNVERIFIED**, not assumed.

## Future transfer sequence after separate owner authorization

1. Freeze approved code SHA, exact reviewed additive SQL, Edge bundle hashes and previous frontend deploy. Re-run this catalog diff and protected four-account tests. Resolve owner scope/visual/KING/hosted gates before a release decision.
2. Confirm production backup/PITR coverage and retention with the actual plan; take a fresh recoverable database backup through the supported provider workflow. Separately preserve Storage objects/metadata and Edge/env configuration: database backup alone does not contain object bytes. Perform restore into an authorized isolated target and verify row counts, FK, private-media access and representative objects. No backup/restore has been executed by this task.
3. Build a **production-specific additive delta** on a restored copy, preserving all production-only columns, tables, triggers and policies. First harden reviewed excessive table privileges and exact-coordinate/public-original paths; inventory the one legacy object privately. Sanitize a new derivative with a manifest and rollback mapping, retain original privately; do not delete or republish it automatically. Prove guest/stranger/owner revocation and EXIF/GPS absence on the derivative.
4. Adopt the actual report integrity/atomic-publication and narrow chat ID/read-state contracts from the reviewed staging files only after adapting existing production schema. Install prerequisites before dependent RPC/policy/Realtime entries; preserve pre-existing API contracts. Add profile/gear/Atlas/meetup/SPOT modules in dependency order with per-module RLS/ACL checks. Apply the new club correlation and meetup leave/cancel deltas only where the catalog proves they are missing. Do not replay base seed/test SQL or old migrations wholesale.
5. Provision production-appropriate private buckets/limits, migrate legacy references through the audited manifest, deploy reviewed photo upload/access handlers before clients depend on them; then adopt the other required Edge bundles and verify each handler's Auth/role checks and secret binding names. Preserve disabled real payments/unsolicited notifications; no Yandex cutover in this operation.
6. Dry-run every step on the restored target with lock/statement timeouts, preconditions, negative RLS tests and rollback compatibility. Record actual order, expected object hashes/ACL and row counts in the final deploy package. A new production approval must identify that concrete package; this document is not that approval.
7. During an approved window apply one bounded additive batch at a time, verify schema/ACL and actual HTTP/JWT/media behavior, then deploy the frozen compatible frontend. Stop on any privacy/auth or migration mismatch. Only a successful human release decision may update main/version/tag; green CI does not make that decision.

## Rollback boundaries

Frontend regression: restore the saved prior build while retaining compatible additive database objects. Database/privacy regression: disable the affected feature and apply a reviewed forward permissions fix; do not restore an insecure broad ACL as a blind rollback. Preserve new accepted data and audit history. Data-loss incident: use verified database PITR/backup and the separate Storage manifest in an approved recovery window; account for new writes since the backup and validate both data and object references. No DROP/CASCADE, TRUNCATE, role grant, production migration or destructive rollback was run.

## Повторный read-only срез FINAL RELEASE INTEGRATION
[Fresh exact diff](../qa/product-contract/SCHEMA_DIFF_20261104_FINAL.json), 04.11.2026 19:31 Москва: все11 catalog-difference sections совпадают с предыдущим срезом; STAGING65 / Production62 migrations, Edge9 /9. Никакая миграция не повторялась и Production не менялась. Env/OAuth/backup/PITR/restore dry run не объявлены проверенными; это сохраняемые readiness gates. Условное разрешение main не разрешает Production SQL/deploy.
