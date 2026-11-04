# ZAPRUDA — executed five-row cleanup and final protected acceptance

04.11.2026 UTC. **NO-GO. Main, Production, technical version and release remain unchanged and explicitly forbidden by the latest owner instruction D18.**

| Executed step | Evidence/result |
|---|---|
| Authorized SQL | Original approved blob `76cf8bb2d8a236cf2c407b3ff5a2fe68c32e06a1`; exactly the five UUIDs in [the guarded input](../qa/product-contract/OWNER_APPROVAL_REQUIRED_feedback_41850073063.sql), only STAGING `yudtbifopfnjtjanaqrd` |
| All preconditions | Exact5, one owner, marker5, every type/category/body/owner-hash/time guard true; both security migrations present; no incoming FK or DELETE trigger. Rechecked after a service-confirmation expiry. No condition weakened |
| Executed deletion | Original executable SQL unchanged; all transactional assertions passed; exactly5 deleted at20:32:18UTC. Old six not deleted again |
| Independent SELECT |20:34:16UTC marker0, IDs0, dedicated feedback-owner history0; repeated20:59:42UTC approved marker0 and IDs0. [Executed proof](../qa/product-contract/FEEDBACK_CLEANUP_41850073063_EXECUTED.json), [fresh readback and live club policies](../qa/product-contract/POST_CLEANUP_SECURITY_4EBA367.json) |
| Final PR93 SHA | `4eba36702a62de0957fb2a0310b0aa6fa8913985`; only existing E2E request marker differs from c216963, runtime identical |
| Protected workflow | [41908405475](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41908405475), job126849136280: **WAITING** required reviewer `staging-e2e`; tests have not started. This is not PASS or a test failure with logs. [Exact status and action](../qa/product-contract/PROTECTED_4EBA367_41908405475.json) |
| Ordinary CI | All13 workflows SUCCESS on4eba367, including TypeScript/lint/build/tests, real PostgreSQL races, privacy and three browser engines. [Run inventory](../qa/product-contract/CI_4EBA367_FINAL.json). Four applicable checks on evidence commit8cbb8d7 also SUCCESS |
| Netlify | Actual invited login and separate application login succeeded. Deployed SHA4eba367, deploy6aeb97993e0be2ef23c56aa8, STAGING only.27 unique CSS viewport layout/readiness cases, eight feed width/theme combinations, screenshots and sanitized diagnostics [manifest](../qa/product-contract/HOSTED_4EBA367_MANIFEST.json) |
| KING | [Live preflight](../qa/product-contract/KING_PREFLIGHT_4EBA367.json):0 moderators,0 approved/reviewed SPOTs,0 catches,0 holders. No fake data/rights. All seven titles retained; positive chain BLOCKED and CARP/WINTER/BOAT public flows still incomplete |

## Actual hosted scope and remaining defects

320/390/768/1440 CSS widths and Matte Black/Electric Blue feed were actually observed on the hosted application. Essential header controls fit and remain44px; no root horizontal overflow or observed foreign Supabase origin. Theme was changed through settings and restored to original Matte Black. [Black320 screenshot](../qa/product-contract/hosted-4eba367/zapruda-4eba367-black-320-final.jpg), [Blue390 screenshot](../qa/product-contract/hosted-4eba367/zapruda-4eba367-blue-390-final.jpg). These show the implemented application, not acceptance of the concurrently approved [new mobile visual target](ZAPRUDA_APPROVED_MOBILE_VISUAL_TARGET_20261104.md).

The27 observations verify layout/readiness only. Two COMMUNITY cases (320Matte Black and390Electric Blue) reproduce the same real backend-contract errors: missing `guide_profiles.live_sonar_system` and missing `public.guide_booking_inquiries`. They remain visible in the measurements, not labelled feature PASS. The canonical guide model uses quotes linked to partner requests; no substitute table, fake guide or fabricated default equipment was created. Hosted signup/confirmation/recovery, two-account positive message/read-receipt/report/media/retry transactions, physical keyboard/safe area and complete owner visual acceptance remain open. No new report/message/catch/SPOT was published by this focused hosted pass.

Resource Timing origins and75 sanitized console entries are preserved; no credential, JWT, cookie, request header, private message, exact GPS, full URL query or complete HTTP trace was captured. All56 original IDs/8modules/7titles remain required. Existing RLS correlation is `m.group_id = social_group_messages.group_id` with accepted membership; both security deltas remain applied and public SECURITY DEFINER functions without search_path=0. This readback is not a replacement for the waiting genuine-JWT run.

## Exact unblock

The owner must open the **existing** run41908405475, choose **Review deployments**, check **staging-e2e** and **Approve and deploy**. The reviewer is configured by GitHub; it is not bypassed or treated as ordinary CI permission. After it starts, read every step, complete workflow conclusion and safe artifact on the same SHA. The historical SUCCESS41850073063/f3bbe1b is retained as historical evidence only. The new run may create another separately identified five-row feedback set; the current permission covers only the already deleted original UUIDs, so no future set may be deleted silently.

Production schema diff, migration/backup/rollback sequence and unverified restore/env/OAuth dependencies remain in [Production readiness](ZAPRUDA_PRODUCTION_READINESS_20261104.md). No Production SQL/deploy, main merge, role grant, bump, tag or release was performed. **NO-GO.**
