# ZAPRUDA 0.7.6 KING FINISH — final integration checkpoint

04.11.2026. **NO-GO. Main has not been updated.** The owner's latest permission is conditional: standard main merge is authorized only after every required release gate passes. No extra generic main permission is needed then. Production SQL/deploy, roles, DNS, payments, package bump and tags remain outside this authorization.

## Exact code and evidence

- Existing PR #93 candidate: **e9fd4aa8172d7e55553c0882640ecebb75c9d421**.
- Existing PR #111 integrates that code and preserves all 56 original IDs, eight modules and seven KING titles. Its current commit/checks are recorded in the PR body; no duplicate PR or force-push.
- Main readback: **0d787d8e615dde821ca326fec1eeb6b9ef4ac15d**, unchanged by this task.
- [Protected run 41850073063](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41850073063): **SUCCESS**, real-pilot job 126644073907 **SUCCESS**, exact SHA **f3bbe1bc4a731c3ec1c56a5b1d7dce13d8d559ec**. [Parsed safe evidence](../qa/product-contract/PROTECTED_F3BBE1B_41850073063.json). It is historical acceptance for f3bbe1b, not automatic acceptance of the later Shell correction.

## Executed work

| Check | Verified result | Remaining boundary |
|---|---|---|
| Four JWT / chat / reports / STREET | Protected workflow SUCCESS: four distinct confirmed JWTs, server read state, private/foreign denial, atomic report rollback/retry, sanitized media, Realtime, real two-user browser journeys and account isolation | Browser frontend was localhost + real STAGING; final e9fd4aa and hosted acceptance are separate |
| Feedback | Real six concurrent requests: five saves, one 429; own history/private-data/direct-write checks PASS | Five new disposable private fixtures remain; this suite explicitly requires externally approved exact cleanup |
| Old cleanup | Prior feedback marker=0, prior private report=0 | The earlier six rows were not deleted again |
| Club RLS | Live SELECT/INSERT correlate membership with social_group_messages.group_id and accepted status. No extra permissive message policies found. Repeated live PostgreSQL rollback negatives PASS | SQL role/claim simulation is not signed-JWT club-creation/moderation acceptance |
| Meetups | Leave, seat release/reuse, cancellation/private denial PASS in live rollback; zero persistent fixtures. Independent PostgreSQL last-seat races PASS in CI | Free meetups stay distinct from paid trips; broader hosted participation acceptance remains open |
| Header defect | Actual authenticated hosted 320px: client width305, profile right342.67, menu right390.67. Root overflow check incorrectly looked green | e9fd4aa hosted after: profile197–241 / menu249–293, both44×44 inside client305; shared three-engine CI bounds PASS |
| Header correction | Badge stacks below unchanged wordmark on narrow screens; compact labelled profile/login controls; menu/auth targets44px. Shared real geometry assertion added to isolated three-engine and protected authenticated browser checks | No assertion removed, no RLS or product feature weakened |
| Local checks | TypeScript PASS; 441 tests/36 files PASS; Node build and Netlify preset build PASS; three preview isolation regressions PASS; source lint PASS with six prior warnings | Local browser binaries unavailable; real three-engine validation runs in existing GitHub Actions |
| Current CI | [Quality 41872344836](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41872344836), [PostgreSQL/Deno 41872344811](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41872344811), [appearance 41872345017](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41872345017); all13 ordinary workflows SUCCESS on exact e9fd4aa, including the new three-engine header assertions | Final docs-head contract/checks and the later protected JWT run must also pass |

The initial local browser launch failed because its Chromium binary was absent, not because an application assertion passed or failed. The normal local lint scan encountered generated .netlify output after the adapter build; the changed source files and the full source scan excluding that generated output passed. CI uses a clean checkout. These tooling details are not release acceptance substitutes.

## Actual hosted scope and deployment

Invited Netlify Google sign-in and a separate real ZAPRUDA email/password sign-in succeeded through the secure credential flow. No credentials, cookies or JWT were read or transferred. One actual account's profile confirms login.

Commits [931a4e4](https://github.com/SergeyGalkin91/zapruda1/commit/931a4e43eb5ff7dcbd4f1e453d8950c9f61645ae), [aa67109](https://github.com/SergeyGalkin91/zapruda1/commit/aa67109409ad1efff3de6002bfd7c0dabf9029b9) and [e9fd4aa](https://github.com/SergeyGalkin91/zapruda1/commit/e9fd4aa8172d7e55553c0882640ecebb75c9d421) added a same-origin hosted QA frame and fixed the actual narrow header. The QA page is generated only for PR93 with the STAGING URL; production and other previews remove it. It never reads credentials.

Netlify initially failed HTTP500 uploading the server function after a successful build in deploys6aeb6373443569202d91a5c3 and6aeb64a459d5b38205f69bc3. **Clean-cache retry [6aeb663d03e8681d52163b74](https://app.netlify.com/projects/zapruda1/deploys/6aeb663d03e8681d52163b74) completed successfully on e9fd4aa.** The deployed QA page independently reports that full SHA. No protection or production publishing setting was changed.

**96/96 hosted layout/readiness checks PASS:** twelve actual routes ×320/390/768/1440 CSS pixels ×Matte Black/Electric Blue. Routes: feed, communities, partners, chat, messages, new report, STREET, profile, settings, atlas, competitions, assistant. Each case recorded actual iframe width, theme persistence, settled loading/images, control bounds/44px targets, no horizontal overflow and Resource Timing backend origins. Only STAGING Supabase was observed. Original Matte Black was restored.

This is a single-account layout/readiness matrix, **not 96 complete functional E2E passes**. Sixteen cases show known real errors: the daily summary cannot load on feed; communities' guide widgets refer to missing guide_profiles.live_sonar_system and guide_booking_inquiries. No invented data or hidden checks were substituted. The canonical guide SQL explicitly uses guide_booking_quotes tied to partner_trip_requests and does not invent guide_booking_inquiries; a contract reconciliation is required rather than adding an arbitrary table to silence the error.

Evidence: [case metrics](../qa/product-contract/hosted-final/viewport-cases-e9fd4aa.json), [summary](../qa/product-contract/hosted-final/viewport-summary-e9fd4aa.json), [hash manifest](../qa/product-contract/HOSTED_FINAL_MANIFEST.json), [320px before](../qa/product-contract/hosted-final/classic-320-feed-viewport-aa67109.jpg), [320px after](../qa/product-contract/hosted-final/classic-320-feed-e9fd4aa-context.jpg), [Electric Blue390](../qa/product-contract/hosted-final/electric-blue-390-feed-e9fd4aa-context.jpg). Captures include parent-browser/QA context: bitmap width is not child CSS viewport width. For1440px, the parent screenshot clips the child right edge; actual JSON metrics cover its full CSS width. Preview collaboration controls may overlay screenshots. No physical-device keyboard/safe-area proof is claimed.

Full functional hosted acceptance remains **OPEN**: new signup/confirmation/recovery, second-account chat/read receipts/transaction/retry/media publication and physical keyboard/safe area. No report or chat message was published during this layout matrix. Historical localhost+STAGING JWT success does not replace these checks.

## Exact cleanup proposal — not executed

Successful run 41850073063 generated five rows with marker QA-FEEDBACK-94788aaa-9749-4d4f-be5f-4d551a67c545. Readback confirmed five exact UUIDs, one owner, the exact disposable technical body/category/time, and zero incoming foreign keys. [Guarded SQL proposal](../qa/product-contract/OWNER_APPROVAL_REQUIRED_feedback_41850073063.sql) is review-only and **has not been executed**. It targets only those five new rows; it neither repeats the old six-row cleanup nor changes unrelated history/quotas/roles.

Before requesting a new protected full run, obtain the required exact cleanup authorization, recheck the guard and own-history precondition, perform only the approved cleanup, then request the existing workflow on the final SHA. Keep environment review intact; no known-dirty run or disabled precondition.

## KING remains BLOCKED

Fresh live counts: **0 moderators / 0 approved-reviewed SPOT / 0 catches / 0 title holders**. All seven titles remain in the contract. The new request makes every title mandatory for 0.7.6 unless the owner explicitly changes release scope; earlier FULL/P? labels are not implicit exclusions.

Server/pure-policy foundation covers all seven nomination identifiers. Public submission/review/leaderboard integration currently covers STREET/UL; complete CARP/WINTER/BOAT public flows remain implementation gaps. Schema presence and isolated fixtures do not constitute their release acceptance.

A real positive cycle needs a genuinely authorized independent moderator, an eligible approved location/category and genuine private evidence from actual authors. At least two eligible catches in the same accepted category are needed to test replacement/revocation/restoration. Self-review, category/tie/race/history/privacy/recipient/idempotency assertions remain required. No moderator, public spot, catch or title was fabricated and no user's privileges were changed.

## Production readiness and safe future integration

[Fresh exact read-only diff](../qa/product-contract/SCHEMA_DIFF_20261104_FINAL.json), sampled 04.11 at **19:31 Moscow**. All eleven catalog-difference sections match the prior scoped snapshot. STAGING65 migrations / production62; nine Edge functions in each with different contracts. The [production transfer/backup/rollback sequence](ZAPRUDA_PRODUCTION_READINESS_20261104.md) remains applicable.

Production-specific blockers remain chat-read RPC/state and atomic publication, GPS/EXIF/legacy original handling, Storage/ACL differences including excessive TRUNCATE grants, Edge/env/OAuth compatibility. Backup/PITR availability, a restored-target dry run and actual production env bindings have not been verified. No Production SQL, data copy, backup restore or deployment was performed.

Read-only main comparison: main is an ancestor of e9fd4aa;331 paths changed or added and zero deleted files. No history, migration, page or component was removed by that integration diff. This is not proof that every product scenario is accepted.

When every mandatory gate actually passes: merge existing #111 into #93's branch using a standard merge; verify exact resulting code/spec tree and CI/JWT; inspect the complete diff/ancestry against fresh main; retarget existing #93 to main if appropriate and use a normal merge preserving history. Read back main SHA, run available main CI/smoke and validate an isolated STAGING deployment for that SHA. Main merge is not Production deployment permission. Until then, both PRs remain Draft and main stays unchanged.

## Decision

**NO-GO:** final hosted/mobile and final protected regression, exact new feedback cleanup, real KING acceptance/public-flow gaps, and verified production transfer/restore compatibility remain unresolved. No requirement is removed or silently deferred to obtain a green release.
