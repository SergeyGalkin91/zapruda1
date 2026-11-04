# ZAPRUDA 0.7.6 KING FINISH — executed final integration checkpoint

04.11.2026, Moscow. **NO-GO: main has not been updated.** The owner's conditional permission already authorizes a normal main merge after every mandatory gate passes. Production SQL/deploy, version bump, tags, DNS, payments and user-role changes remain outside that permission. Technical application version remains0.7.5.

## Exact candidates and preserved work

- Code PR #93: **c21696356cd1e9eb211af06e8645ab8872002701**.
- Spec PR #111: synchronized through normal merge commits in its existing branch. The current documentation SHA/checks are in the PR body; no duplicate PR or published-history rewrite.
- Main readback: **0d787d8e615dde821ca326fec1eeb6b9ef4ac15d**, unchanged.
- Read-only main comparison: main is an ancestor;335 changed/added paths, **zero deleted files**. [Readback](../qa/product-contract/LIVE_FINAL_SECURITY_20261104.json).
- All56 original feature IDs, eight modules and seven KING titles remain in [the matrix](ZAPRUDA_FEATURE_MATRIX.md). Unfinished requirements are retained; no release waiver or silent deferral was introduced.

## Implemented corrections

| Commit | Confirmed problem | Executed correction and verification |
|---|---|---|
| [e9fd4aa](https://github.com/SergeyGalkin91/zapruda1/commit/e9fd4aa8172d7e55553c0882640ecebb75c9d421) | Authenticated320px header clipped profile/menu despite a green root-overflow check: profile right342.67/menu390.67 in client305 | Narrow layout retains the wordmark, stacks STAGING and uses labelled44px controls. Actual after: profile197–241/menu249–293. Shared bounds assertions added to isolated and real-JWT browser suites |
| [610d0f9](https://github.com/SergeyGalkin91/zapruda1/commit/610d0f9b56c23e282fdb01b33e08b0b2c9aa933c) | Daily brief function was absent from STAGING; its old code validated a user but queried preferences without forwarding that user's JWT | Per-request Authorization/RLS context, confirmed email, private no-store response, explicit database errors and rejection of future/stale/non-HTTPS news. Existing function deployed **only to STAGING**, version1, verify_jwt=true. Live source readback matches Git; anonymous401; real signed-in city weather/news rendered. Nine pinned-SDK Deno regressions PASS |
| [c216963](https://github.com/SergeyGalkin91/zapruda1/commit/c21696356cd1e9eb211af06e8645ab8872002701) | A third-party decorative chat photo remained pending beyond30seconds; the old icon appeared only after an upstream error | Existing room icon remains during loading; stalled/failed artwork releases after5seconds; each URL has an isolated lifecycle. Five component regressions cover load, error, timeout, URL change and unmount. User message/report media is unchanged; final hosted chat readiness PASS atall4widths/boththemes |

Preview-only same-origin viewport tooling was added by [931a4e4](https://github.com/SergeyGalkin91/zapruda1/commit/931a4e43eb5ff7dcbd4f1e453d8950c9f61645ae) and [aa67109](https://github.com/SergeyGalkin91/zapruda1/commit/aa67109409ad1efff3de6002bfd7c0dabf9029b9). It generates only for PR93 plus the exact STAGING URL; production/other previews remove the output. Three isolation regressions PASS. It never reads credentials.

The parallel spec commits5564945 and913af36 added and linked [approved brand direction variantB](ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md). It is retained unchanged and linked as the latest direction. Production SVG/icons, exact typography/wallpapers and separate UI visual acceptance are still pending; current screenshots are not misrepresented as its implementation.

## CI and protected JWT evidence

**All13 ordinary workflows SUCCESS on c216963.** [Complete run inventory](../qa/product-contract/CI_CURRENT_C216963.json), [Quality41889599978](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41889599978), [PostgreSQL/Deno41889599989](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41889599989), [three-engine appearance41889599809](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41889599809). TypeScript, build and **446 tests/37 files PASS**; ESLint0errors/6existing warnings. The new component's focused11tests and local typecheck/lint also passed. The earlier local browser launch lacked a Chromium binary; real browser assertions passed in GitHub Actions, not in that failed local launch.

[Protected run41850073063](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41850073063) and real-pilot job126644073907 were **SUCCESS on f3bbe1bc4a731c3ec1c56a5b1d7dce13d8d559ec**. [Safe parsed proof](../qa/product-contract/PROTECTED_F3BBE1B_41850073063.json): four distinct confirmed real JWTs; server read state, foreign/private denial, atomic reports/rollback/retry, sanitized media and Storage, Realtime, actual two-user browser chat/read/reload, three-step report/drafts and STREET timer/tackle/import/account isolation. Core/browser fixture cleanup=true. Feedback saved5requests and throttled1; negative SPOT moderation/evidence preflight passed. The browser frontend was localhost plus real STAGING, **not hosted Netlify**. This run predates the later code corrections and does not accept c216963 automatically.

A final protected full run is still OPEN. Do not disable the feedback precondition, substitute simulated claims for real JWTs, or bypass environment review.

## Actual hosted final scope

Private Netlify access and existing ZAPRUDA email/password login succeeded through the secure credential flow. No credential, cookie or JWT was inspected or copied. Final preview reports **c216963**, Netlify deploy **6aeb7c4c1253f47978473cd0**; GitHub's deploy-preview status is SUCCESS. [Preview](https://deploy-preview-93--zapruda1.netlify.app/).

**26/26 focused hosted layout/readiness cases PASS:**12routes at320px Matte Black, plus feed/chat at320/390/768/1440 in both themes. Each accepted case records matching route/theme/width, settled visible loading/images, signed-in profile, actual header bounds/44px targets, no horizontal overflow and no observed foreign Supabase backend. The live daily brief rendered in all8feed cases. Original Matte Black was restored and verified through the real UI's aria-pressed state.

- [Current case metrics](../qa/product-contract/hosted-current/zapruda-hosted-cases-c216963.json), [summary and screenshot names](../qa/product-contract/hosted-current/zapruda-hosted-summary-c216963.json), [bounded sanitized console log](../qa/product-contract/hosted-current/zapruda-hosted-console-c216963.json), [hash manifest](../qa/product-contract/HOSTED_CURRENT_MANIFEST.json).
- [Header before320](../qa/product-contract/hosted-final/classic-320-feed-viewport-aa67109.jpg) / [current320 after](../qa/product-contract/hosted-current/zapruda-current-classic-320-feed-c216963.jpg).
- [Chat deadline regression](../qa/product-contract/hosted-current/zapruda-chat-thumbnail-regression.json) / [current chat320](../qa/product-contract/hosted-current/zapruda-chat-thumbnail-after-c216963.jpg). The old native context capture occurred later than the pending-image measurement and may already show the old error fallback; it is not presented as a picture of the earlier blank state.
- [Real signed-in daily brief after](../qa/product-contract/hosted-final/zapruda-daily-brief-after-610d0f9.jpg) / [Electric Blue live feed](../qa/product-contract/hosted-current/zapruda-c216-blue-daily.jpg).

Historical **96/96 layout/readiness cases belong to e9fd4aa**, preserved in [the separate summary](../qa/product-contract/hosted-final/viewport-summary-e9fd4aa.json). That checkpoint initially showed feed/guide errors; the feed error was subsequently corrected. It is not relabelled as96functional E2E passes or as96tests on c216963.

These are actual single-account same-origin **CSS iframe** checks, not physical phones or a complete functional E2E. Native images include the parent-browser/QA context; bitmap width differs from child CSS width and the1440px right edge can extend outside the bitmap. Preview collaboration controls can overlay screenshots. Resource Timing records origins only, excluding complete HTTP responses and WebSocket traffic; console capture is capped at80entries with query strings removed. Early collector observations using the wrong menu tag or an unready route were rejected and rerun; acceptance conditions were not relaxed.

Remaining hosted gates: real signup/confirmation/recovery, second-account chat/read receipts/transaction/media/retry publication, physical keyboard and safe area, plus authorized role-only screens. No new chat message or report was published in the layout matrix.

The communities guide contract still has real errors: missing guide_profiles.live_sonar_system and guide_booking_inquiries. Existing canonical SQL instead uses guide_booking_quotes linked to partner_trip_requests and explicitly avoids inventing the inquiries table. This requires a proper contract reconciliation; no arbitrary table, fabricated guide data or hidden failure was introduced.

## Live security, meetups and cleanup

[Fresh live readbacks](../qa/product-contract/LIVE_FINAL_SECURITY_20261104.json): club SELECT/INSERT both correlate accepted membership with **social_group_messages.group_id**; sender is auth.uid(); exactly the intended two policies, not m.group_id=m.group_id. Both prior security migration deltas remain applied; public tables withoutRLS=0. No duplicate migration was applied.

Live rollback PostgreSQL negatives passed for own/foreign club, pending/declined/anonymous access and meetup leave, released-seat reuse, limits, cancellation/private denial/history retention; persistent club/meetup fixtures=0. Independent PostgreSQL last-seat races PASS in CI. These role/claim rollback tests are not signed-JWT moderation acceptance. Free meetups remain distinct from paid trips. No RLS, EXECUTE protection or user privilege was weakened.

Old cleanup readback remains **0 old feedback rows / 0 old private report**. It was not repeated. The successful protected run left **5 new disposable private feedback rows**, marker QA-FEEDBACK-94788aaa-9749-4d4f-be5f-4d551a67c545, with exact UUID/body/category/time/owner guards and zero incoming foreign keys. [Reviewable guarded cleanup SQL](../qa/product-contract/OWNER_APPROVAL_REQUIRED_feedback_41850073063.sql) **has not been executed**. It requires the separately specified owner authorization for this new set. After that authorization: recheck guards, remove only the exact approved rows, read back0, then trigger the existing protected workflow on the final relevant SHA and retain environment review.

## KING remains BLOCKED

Fresh actual counts: **0moderators / 0approved-reviewed SPOT / 0catches / 0title holders**. All seven titles remain mandatory for the requested scope unless the owner explicitly changes it. No title, moderator, spot or catch was fabricated and no real-user privilege was changed.

The pure policy/schema retain all seven identifiers, ties and category constraints; the current public submission/review/leaderboard flow covers STREET/UL. Complete CARP/WINTER/BOAT public flows remain implementation gaps, not merely missing test data. Genuine independent positive acceptance of submit→evidence→review→title→notification→history→revoke→recalculate is still absent.

Actual positive testing requires an independently authorized moderator, genuine eligible location/category and private evidence from actual authors; at least two eligible catches in the same category are needed to exercise replacement/revocation/restoration. Category/territory/season/lawful validation, no-self-review, tie/race/history/privacy/recipient checks remain required. A narrower release needs an explicit owner scope decision; none was assumed here.

## Production compatibility and integration boundary

[Exact read-only catalog diff](../qa/product-contract/SCHEMA_DIFF_20261104_FINAL.json) retains its19:31MSK snapshot and all11catalog sections. [Later Edge inventory](../qa/product-contract/EDGE_INVENTORY_FINAL_20261104.json): STAGING10functions / Production9 after the STAGING-only daily brief deployment. SQL catalog state was not changed by this checkpoint. Production SQL/data/deploy was never mutated.

[Transfer, backup and rollback sequence](ZAPRUDA_PRODUCTION_READINESS_20261104.md) preserves production-only tables/data, adapts additive chat-read RPC/state and atomic reports, separately handles GPS/EXIF/legacy originals, Storage/ACL/RLS/SECURITY DEFINER/EXECUTE, Edge/env/OAuth compatibility. Production backup/PITR availability, restored-target dry run and actual env bindings are still UNVERIFIED. A schema diff alone is not a tested production migration or rollback.

When every mandatory gate actually passes, use normal history-preserving integration of the existing PRs; recheck the full resulting tree/CI/JWT, merge to fresh main through branch protection, read back the resulting SHA and smoke an isolated STAGING deployment. No extra generic main permission is needed then. A main merge is not production deployment permission.

**Current decision: NO-GO.** Final protected JWT/approved exact cleanup, full functional hosted and physical-device acceptance, guide contract, real KING/public-flow completion and verified production migration/restore compatibility remain open. No PR was merged into main and no requirement was removed to obtain a green release.
