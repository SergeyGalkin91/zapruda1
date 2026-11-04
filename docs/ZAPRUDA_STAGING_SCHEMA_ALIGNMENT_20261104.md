# STAGING schema alignment — 04.11.2026

Canonical PR #93 → release/v0.7.5-spot. Work mirror: work/v075-consolidation-20261104. Production/main/DNS/payment systems and existing public release remain untouched. This document describes a STAGING candidate, not launch approval.

## Fresh baseline, preserving subsequent work

The earlier 31-table audit is historical. Readback during continuation found these additional already-applied migrations; **do not replay them**:

| Version        | Name                                                      | Adopted result                                                                           |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 20261104000548 | staging_minimal_report_dependencies_20261104              | catches/comments, visible-report RLS                                                     |
| 20261104000608 | staging_minimal_report_restrict_inherited_grants_20261104 | column-level access; photo_url not exposed                                               |
| 20261104001134 | staging_geo_text_chat_rls_20261104                        | geographic catalog, messages/reactions, home geography posting policy, ensure_chat_place |

Actual baseline: 36 public tables, zero catches/comments at inspection. Read-only production comparison covered column types/defaults/nullability, PK/FK/CHECK/UNIQUE, indexes, trigger definitions, policies, grants, function bodies, bucket settings and Storage policies. No production content/private GPS/original images were read or copied. Executable adopted SQL is stored **only** under `supabase/tests/unit/*_adopted.sql` for disposable clones; it is not a deployment recipe.

## Ordered new deltas

| Delta                       | Dependencies / behavior                                                                                                                                                      | Access contract                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| v075_report_integrity.sql   | Existing reports/profiles + adopted catches/comments; composite report/author FK, bounded catch/comment fields, private retry receipt and atomic publish_report_with_catches | SECURITY INVOKER; confirmed nonanonymous actor; all catch failures roll report back; photo_url inaccessible; no exact coordinates accepted                                                                         |
| v075_public_chat.sql        | Existing geographic chat; new chat_message_photos, canonical owner/message/photo.jpg path, one attachment/message, trusted sanitized marker, private JPEG-only 5 MiB bucket  | Existing country/region/city posting rules and ensure_chat_place retained; confirmed-write restrictions; API cannot register media or read/sign/upload Storage directly; signed-in shared chat reads remain shared |
| v075_private_gear_marks.sql | profiles/auth.users, rod/reel/line references, one primary kit/owner, private coordinates with range checks                                                                  | owner-only RLS; no guest grants; type/identity immutable to clients; primary selection only through guarded serialized RPC                                                                                         |
| v075_profile_progress.sql   | Existing reports/catches/photos/reactions/trips; two missing own-progress aggregates, activity windows, beta applications, own badges view                                   | Invoker RPCs; security_invoker view; server-generated 5-minute timestamps and pending status; no self-approval or backdated activity                                                                               |

Files stay outside the automatic production migration chain. Before each deployment, compare the actual target objects/functions/history again. Any pre-existing newly named object requires inspection instead of overwriting or replay.

## Client changes

- Keep the catches availability preflight from 478ee6e. With fish entered, use one transaction for report/catches/retry receipt; failed writes cannot leave a report. Persist a random publication ID in the per-account local draft; same-payload retry after a lost response/reload returns the same report. Different-payload reuse is rejected.
- A no-catch outing continues to use fishing_reports directly and never calls the catch RPC or table. Existing per-account/unmount guards remain. Mutations and photo upload bind the captured session token; committed form values freeze during photo retry. Photos are not stored in localStorage.
- Chat decodes the user's photo into fresh JPEG pixels, then uses bounded server filtering/reservation. No original photo upload or reusable signed Storage URL. JWT gateway responses are fetched into short-lived browser Blob URLs and revoked on route cleanup/refresh. Shared chat allows another confirmed participant to read the sanitized image; guest is denied.
- No wizard, navigation, themes, title thresholds or visual redesign is introduced.

## Validation definitions

Local Vitest includes disconnected PostgreSQL/RLS and actual component regressions. It is **not** a JWT substitute. The isolated suite covers invalid-catch rollback, retry conflict/idempotence, report/author FK, original/GPS column denial, public→private row visibility, membership/confirmation, private gear/marks, primary-kit integrity, own progress, non-forged badges, and content-preserving rollback.

`pilot-schema-postgres.yml` additionally runs PostgreSQL 17 with independent sessions: four concurrent retries, five rounds of place uniqueness, failed catch transactions, simultaneous primary-kit selection, empty rollback/reapply and populated rollback refusal. Deno checks both actual chat photo entrypoints and their reused audited handlers/filter.

`pilot-staging-jwt.yml` uses protected staging-e2e credentials for four **real confirmed users**. The script verifies actual API atomicity, owner/stranger boundaries, public→private HTTP media revocation, comments, metadata, direct Storage signing denial, geographic messages/reactions, photo retry/access and private profile dependencies. Fixtures are either private or explicitly marked temporary no-fish transport tests. No fake public catch, moderator or approved SPOT is provisioned. Existing primary-kit choice/preferences are preserved; only recorded owned QA entities are cleaned. A prepared script is not a PASS.

Rollback: `rollback_v075_pilot_schema.sql` is tested on a disposable clone. It retains all adopted tables/policies/catalog and refuses when any new user content, object or idempotency history would be lost. Stop clients first; prefer a reviewed forward migration after actual use. Existing media/coordinate safeguards never reopen.

## Remaining dependencies and gates

After all four new deltas, expected public count is 42. Eleven previously identified frontend table dependencies remain outside this core pilot alignment:
`ai_memberships`, four `atlas_*` tables, `community_requests`, `follows`, `guide_booking_inquiries`, `guide_verification_applications`, `spearfishing_profiles`, `zapruda_admins`.

Do not represent analytics memberships, Atlas recognition/claims, feedback/admin/guide/payment or spearfishing/mutual-follow UI as accepted STAGING flows. Separate read-only structural/RPC review is still required for those surfaces. `identify-fish-photo` is not deployed in STAGING. No fabricated admin role, payment or verified achievement is created as a schema workaround.

Yandex run 41736781269 still fails before runner with two unreadable Annotations and no pending deployments. Owner action: provide **only the text of those two Annotations**, not another key/password. Canary v2 and legacy v14 stay separate. No real provider success, backup, billing/IAM or shared quota acceptance is inferred from CI.

KING live still needs an owner-authorized independent moderator, legally verified real spot and authentic evidence. Production privacy drift (legacy original/policies) and Russian mobile-network acceptance remain separate owner/security gates.

## Deployment evidence

PENDING at preparation: new deltas and chat functions must be checked against the current target, applied only in STAGING, and read back. Exact commit/run results and applied versions are recorded in the completion update below; never infer hosted acceptance from the prepared files above.
