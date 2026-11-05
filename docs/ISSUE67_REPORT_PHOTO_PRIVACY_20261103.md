# Report photo privacy candidate — 2026-11-03

Related: issue #67, release candidate PR #63, SQL geo regression PR #72. This is a separate candidate; it does not close #67 or release v0.7.1.

## Resulting behavior

- The report form decodes JPG/PNG/WebP into oriented pixels, resizes to a maximum 2048 px edge and produces a fresh JPEG. Source filenames are replaced with `photo.jpg`.
- The new `report-photo-upload` Edge Function verifies the real, confirmed, non-anonymous Supabase user and report ownership before constructing its private writer. The server removes every JPEG APP/COM metadata segment, rejects unsupported containers, bounds the request/file/dimensions and reserves one of six photo rows before storing bytes. Repeating a photo ID is safe for its same owner/report.
- Only the server can mark a photo sanitized or write/delete a trusted derivative. Restrictive policies also constrain older permissive Storage/metadata grants. Legacy originals are owner-only; legacy rows are never automatically marked sanitized.
- The public feed requests only sanitized copies associated with a currently public report. Derivative links expire after 60 seconds; failed images request fresh links with a publication check and a retry throttle. There is no fallback to originals.
- The coordinate migration preserves complete legacy coordinates in the existing private table before clearing public fields. It aborts on invalid/incomplete/conflicting data and enforces physical NULL public exact-coordinate fields plus owner/report RLS. It creates no new location table.

## Verified locally

- **215/215 tests, 17 files:** existing application regressions plus JPEG/handler, PostgreSQL policy/constraint and public URL issuance tests.
- Strict TypeScript: PASS. ESLint: 0 errors, 6 existing Fast Refresh warnings.
- Production client/server build: PASS. `git diff --check`: PASS.
- Independent Pillow decoding of two synthetic baseline/progressive JPEGs after the actual server filter: PASS; pixel bytes unchanged, EXIF removed.
- The browser workflow checks the actual client conversion in Chromium and Firefox using a synthetic oriented EXIF/GPS fixture. Read its run results for the published commit; local browser binaries were unavailable. It blocks Supabase network access and does not sign in.

## Applied to STAGING only

Project: `yudtbifopfnjtjanaqrd`.

| Source migration                                   | Remote history version | Status                                                                      |
| -------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `20261103180000_report_photo_privacy.sql`          | `20261103151648`       | Applied                                                                     |
| `20261103180100_report_exact_location_guard.sql`   | —                      | **Not applied**: tool confirmation expired; no retry to bypass confirmation |
| `20261103180200_report_photo_storage_boundary.sql` | `20261103153021`       | Applied                                                                     |

The first migration SHA-256 is `f117f1525432f47b47bfd7f25344743faf6dad5940a9930f71fc763d49284654`; the storage follow-up is `a3428f3c3d7a4ebb12aed23a8f37330392c7b7ed9d1ba0c9222a25f9ba60920d`. Keep migration-history reconciliation explicit before any CLI push: tool-applied history timestamps differ from the repository filenames. Do not blindly apply the entire pending migration list.

`report-photo-upload` was deployed **ACTIVE v1, verify_jwt=true**. All three deployed source files were read back and matched this candidate exactly. A real anonymous HTTP POST returned **401**. That is a gateway check, not proof of authenticated uploading.

`supabase/tests/security/zapruda_report_photo_staging.sql` passed against hosted STAGING using SQL roles/claims. It verified guest sanitized-only visibility, original/private-photo exclusion, owner access, stranger metadata-delete/object-rename denial, immutable client sanitization markers, rejection of exact public GPS and removal of new guest access after publication revocation. It creates no Auth users or binary objects and ends with ROLLBACK. Counts afterward: 1 existing report, 0 photos, 0 private locations, 0 photo Storage objects, 0 synthetic reports.

Hosted Storage independently forbids direct SQL DELETE. The first rollback-test attempt hit that guard; the final test preserves it and leaves deletion acceptance to the real Storage API. Offline PostgreSQL tests cover restrictive DELETE policies even with deliberately broad legacy grants.

STAGING already has strict NULL-coordinate constraints and owner private-location RLS. The new coordinate migration remains an offline-tested candidate, not an applied STAGING/prod parity claim.

## Remaining acceptance and rollout

1. Configure four correct, distinct, confirmed STAGING identities and protected `staging-e2e` credentials as described in `V071_STAGING_E2E_RUNBOOK.md`. No passwords were obtained or changed in this work. Real authenticated functional gates remain unconfirmed.
2. With real user JWTs, upload the synthetic EXIF fixture through the application, download the served derivative and independently decode/check metadata. Check guest, stranger, owner and authorized admin behavior over REST/Storage HTTP, direct raw/derivative overwrite/delete attempts, retry/concurrent uploads, and private-report access.
3. Revoke publication and verify no newly issued URL; wait for an existing 60-second signed URL to expire. Already downloaded images cannot be recalled. Previously issued legacy URLs may retain their original longer lifetime; do not claim immediate revocation at rollout.
4. Review all existing views/RPCs and private-GPS access on the actual target. Two-decimal rounding limits precision but does not prove anonymity. Text, visible landmarks and steganography are outside the metadata filter's guarantee. The server filter validates JPEG structure, not a complete image codec; client pixel decoding plus independent browser/decoder checks remain relevant.
5. Resolve coordinate-migration confirmation/history and target schema drift. Production has **one legacy photo row** and needs protected original-preserving reprocessing; never set a sanitized marker on unprocessed legacy bytes. Do not expose private object URLs in issues/logs. Keep an auditable original-to-derivative mapping during that separate operation.
6. Confirm backup/restore and the production rollout target, obtain the production privacy-change approval required by #67, then deploy the reviewed migrations/function/client in a controlled window. There is no automatic production migration/deployment or merge in this PR. Keep payments outside this release's accepted scope.

Do not disable RLS, JWT verification, protected environment review or hosted Storage deletion guards to make acceptance pass. Keep issue #67 open until its real HTTP/browser and production parity gates pass.
