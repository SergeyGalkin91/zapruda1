# ZAPRUDA — P0 continuation, 04.11.2026

**NO-GO.** Technical version remains 0.7.5; target 0.7.6 KING FINISH is unchanged. Code candidate: `f3bbe1bc4a731c3ec1c56a5b1d7dce13d8d559ec`, existing PR #93. This report supersedes the current-state cleanup and security paragraphs of earlier acceptance reports; their exact-SHA results remain historical evidence.

## Executed changes

| Area | Executed result | Evidence / remaining boundary |
|---|---|---|
| Prior six QA records | Readback 04.11 15:01:31 UTC: five exact feedback IDs=0, old marker=0, old private report=0, named hosted QA publications=0. No repeat deletion | Previous authorized cleanup c97bac5 remains authoritative |
| Club chat RLS | SELECT/INSERT now correlate `m.group_id = social_group_messages.group_id`; sender must equal auth.uid, membership accepted. No other permissive SELECT/INSERT/ALL policies found | STAGING migration **20261104133211**, [delta](../supabase/staging/v076_club_message_membership_scope.sql); no grants widened |
| Meetup leave | Existing accepted participant can leave; owner seat cannot leave, owner cancels the post; declined participant can re-request and needs owner approval | STAGING migration **20261104133529**, [delta](../supabase/staging/v076_meetup_leave_cancel.sql), UI controls in SocialMeetups |
| Seat release | Leaving returns occupancy 3→2; next approved person fills it; cancellation returns active occupancy 0 and denies further admission | Parent-row FOR UPDATE and 3-seat ceiling retained |
| Last-seat race | Five PostgreSQL 17 rounds, two independent sessions competing: one accepted, one MEETUP_FULL, exactly three accepted including owner | [CI 41840417153](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41840417153), artifact 13328885740; repeated on final f3bbe1b candidate in run 41850086325 |
| Private rights | Own accepted access works; pending/declined/other club/anonymous denied; removal regression revokes previously accepted member. Left/cancelled meetup loses private details and messages; history retained | 7 disconnected PostgreSQL/RLS tests; live STAGING rollback test PASS, zero fixtures; not signed JWT |
| Free vs paid | Changes only meetup_* and club message policies. No payment flow, guide price, partner_trip policy or technical version changed | Isolated meetup schema has no price/fee columns; paid trips remain a separate module |
| UI safety | Leave/withdraw/rejoin/cancel controls; cancelled post hides private chat; polling revokes cached private data; Auth identity change clears caches | 9 SocialMeetups component tests; no theme redesign |

Commits: [a671f85](https://github.com/SergeyGalkin91/zapruda1/commit/a671f85f7d0e809c1469e5da9ea27dc89eb909ca), [f3bbe1b](https://github.com/SergeyGalkin91/zapruda1/commit/f3bbe1bc4a731c3ec1c56a5b1d7dce13d8d559ec), [cd8a0ac](https://github.com/SergeyGalkin91/zapruda1/commit/cd8a0ac0f06c1ef66a2e8cea86bf21cde1b4ec1e), [e8620d4](https://github.com/SergeyGalkin91/zapruda1/commit/e8620d43c18b75d4d060c2f249eebdffa4184b0a), [ba1275f](https://github.com/SergeyGalkin91/zapruda1/commit/ba1275f90a9ec593d0a2a97f4628f96faed89c29). The first PostgreSQL CI failed because its scalar parser treated psql `t/f` as JSON; e8620d4 fixes the harness and the real PostgreSQL run passes. No application failure was suppressed.

Live STAGING [rollback test](../supabase/tests/security/v076_community_boundaries_rollback.sql) first reproduced `MEETUP_ACCEPTED_IMMUTABLE`, then passed after the delta. Four existing confirmed identities used only in an uncommitted subtransaction; no Auth user or real role created/changed. Intentional exception rolls back every fixture. Returned `club_fixtures_remaining=0`, `meetup_fixtures_remaining=0`. SQL role/claims simulation is explicitly distinct from actual signed JWT acceptance.

## CI and protected acceptance

**13/13 ordinary workflows PASS** on final **f3bbe1b**: [quality 41850086290](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41850086290), TypeScript, ESLint 0 errors / 6 prior warnings, build, **441 tests / 36 files**, PostgreSQL/Deno [41850086325](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41850086325), Docker, Node, privacy, mobile and [three-engine appearance 41850086260](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41850086260). The enhanced appearance test checks the actual STREET computed gradient at 320/390/768/1440, including legacy gradient colors; it remains isolated CI, not hosted JWT E2E.

Requested old run **41777927568 attempt 2** on 2051567 after zero readback. It waited for environment review; no steps executed. Automatic approval review rejected the agent's Approve and deploy action, requiring owner approval. The waiting attempt was cancelled once the security candidate changed; its original attempt-1 FAIL remains history.

New final [protected run **41850073063**](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41850073063), exact SHA **f3bbe1bc4a731c3ec1c56a5b1d7dce13d8d559ec**, is **WAITING for staging-e2e approval**. Waiting superseded runs ba1275f/41844386910 and a671f85/41849291621 were cancelled before any test step after hosted defects were fixed. Owner action: **Review deployments → staging-e2e → Approve and deploy**. No protection/branch rule was edited. Four real JWT identities, feedback precondition and 6→5/429 concurrency, API/media/privacy/Realtime, chat/reports/STREET Browser journeys and fixture results must all execute before declaring PASS. They have not been accepted on this SHA. Existing feedback script emits exact fixture IDs for external cleanup; no broad cleanup or quota reset is authorized by a green test.

## Actual hosted Preview

Invited Netlify Google login and **actual ZAPRUDA account login** succeeded separately in Cloud Browser without cookie/JWT transfer or public access changes. Private Preview opens the authenticated STAGING application. Latest observed [deploy **6aeb44183e24593119932b5b**](https://app.netlify.com/projects/zapruda1/deploys/6aeb44183e24593119932b5b) is **f3bbe1b**, PR #93, verified in the Netlify deploy list and the current document's Netlify deploy frame. Previous observed ba1275f deploy 6aeb3c1095c52af6c336ceb6 and a671f85 deploy 6aeb42fc1a7d9bf3cdc120f1 correspond to the before/after evidence.

Actual hosted checks (one genuine account, desktop viewport 1348×926): profile data after login/reload; chat mine/unread filters and loaded own room/composer; report steps 1→2→3 without a POST, no-catch/private default, reload restores step/title/story/privacy; STREET timer 0→1 min automatically, 2 min after reload, tackle/lure/notes retained, completed session opt-in import transfers date/place/tackle/lure/story; repeated import asks confirmation. QA draft was cleared, QA STREET session removed through its own UI, original Matte Black theme restored. No hosted report or chat message was published.

Hosted QA found and fixed two real defects: **a671f85** replaces the legacy olive STREET hero with a semantic Electric Blue gradient; **f3bbe1b** uses actual line breaks in the imported story instead of literal backslash-n. Component regression and three-engine computed-style assertions added. Actual hosted hero readback: backgroundColor **rgb(25,62,150)**; gradient **rgb(32,82,187) → rgb(24,59,146) → rgb(97,64,81)**. Import readback: realNewline=true, escapedNewline=false.

[STREET before](../qa/product-contract/hosted-street-blue-before-ba1275f.jpg) / [after](../qa/product-contract/hosted-street-blue-after-a671f85.jpg), [import before](../qa/product-contract/hosted-import-blue-before-ba1275f.jpg) / [after](../qa/product-contract/hosted-import-blue-after-f3bbe1b.jpg), [private report](../qa/product-contract/hosted-report-private-ba1275f.jpg), [Matte chat](../qa/product-contract/hosted-chat-matte-ba1275f.jpg), [Blue profile](../qa/product-contract/hosted-profile-blue-f3bbe1b.jpg) / [Matte profile](../qa/product-contract/hosted-profile-matte-f3bbe1b.jpg).

[Captured console log](../qa/product-contract/hosted-console-f3bbe1b.json): the latest 50 warning/error entries were browser-extension metadata errors; no application entry in this bounded capture. Browser-extension identifiers are omitted. [Machine-readable result and screenshot hashes](../qa/product-contract/P0_RESULT_20261104.json). Full network trace and **hosted mobile 320/390 in both themes, two-user positive read receipts/Realtime and actual hosted publication/retry/photo revocation remain NOT ACCEPTED**. The connected Cloud Browser has no viewport resize API; current desktop captures must not be labelled mobile. CI mobile checks use isolated browsers and independent CI has no Netlify invited session; never copy cookies/JWT to bridge them. Actual protected four-account test waits for the owner; no gate is relaxed to make it green.

## KING: implemented server and remaining real prerequisites

Server schema preserves all seven nominations, five leagues and scoped category constraints. `zc_spot_submit`, private evidence access, independent `zc_spot_review`, internal award/history/outbox, `zc_spot_revoke` and recalculation are installed. Current public leaderboard/review integration is scoped to STREET/UL; schema/pure-policy support of CARP/WINTER/BOAT is not a complete accepted public flow. All seven titles remain in the 56-ID contract.

Live counts: **0 moderators, 0 approved/reviewed spots, 0 catches, 0 title holders**. No roles, public spots or catches fabricated.

Minimum real test input: owner identifies a genuinely authorized independent moderator and separately authorizes that person's STAGING moderation access; a real legally eligible SPOT is reviewed; two real eligible catches in the same category with private genuine evidence are supplied by their actual authors. Do not send exact GPS or credentials through public issues/chat. No test participant reviews their own catch.

| Step | Required assertion |
|---|---|
| Submit / evidence | Actual confirmed author JWT; pending result, private original/evidence, outsider and anonymous denial |
| Independent review | Real approved moderator JWT; self-review and non-moderator denial; lawful/method/gear/welfare evidence reviewed |
| Award / history | One atomic canonical winner per category; history references real catch and predecessor; tie preserves incumbent |
| Replacement | Second genuine better catch becomes winner; only scoped subscriber/prior holder notified; no unrelated recipients |
| Revoke / recalculate | Moderator supplies bounded real reason; revoked winner removed, eligible predecessor restored, history appended |
| Notification / retry | Distinct event key, correct recipients once; repeated review/revoke idempotent; private evidence never included |

No positive KING E2E claimed. These inputs and public-flow gaps remain release blockers.

## Production

[Exact scoped read-only schema diff](../qa/product-contract/SCHEMA_DIFF_20261104_P0.json), [catalog query](../qa/product-contract/schema_catalog_readonly.sql), [transfer/backup/rollback sequence](ZAPRUDA_PRODUCTION_READINESS_20261104.md). Production, main, DNS, billing, roles, technical version and tags unchanged. Both existing PRs stay Draft; no automatic merge or release GO.
