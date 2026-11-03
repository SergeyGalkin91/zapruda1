# v0.7.1 STAGING verification report — 2026-11-03 (Europe/Moscow)

Scope: [PR #63](https://github.com/SergeyGalkin91/zapruda1/pull/63), feature branch `fix/issue61-v071-p0-stages-5-8`, base `release/v0.7.1-integration-20261102`, STAGING `yudtbifopfnjtjanaqrd`. The PR remains a draft. No production/main changes or merge were performed. No passwords, keys, JWTs or real account identities are included in this report.

## Current result

**148 local tests PASS across 12 files**, including **34 disconnected PostgreSQL security/state checks**, **49 offline tests executing the actual Edge handler sources**, and **30 client/chat/time regression cases**. Frozen installation, application build, migration filename audit, meetup static guards, E2E script syntax and targeted test-file lint/format checks PASS. Authenticated live E2E remains blocked as described below.

Two corrective SQL migrations were applied only to STAGING. Both Edge functions are ACTIVE **v4**, with `verify_jwt=true`; deployed source readback matches the validated files exactly. Two real unauthenticated HTTP POST checks returned **401**. These requests prove gateway rejection only.

The four requested authenticated live E2E gates remain **BLOCKED**, with **0/4 confirmed PASS**. Previously launched Actions jobs stopped on missing protected configuration before authentication or provider calls. No live competition race, meetup race, xAI generation or weather retrieval is claimed.

## Protected environment

Created `staging-e2e` through the signed-in GitHub browser and verified:

- Required reviewer: `SergeyGalkin91`; administrator bypass OFF.
- Exactly two permitted branches: `fix/issue61-v071-p0-stages-5-8` and `release/v0.7.1-integration-20261102`; zero permitted tags. `main` does not match.
- Non-secret variable `ZAPRUDA_E2E_STAGING_URL` set to the designated STAGING URL.
- Zero environment secrets at the last browser readback. The jobs require one publishable key and four email/password pairs, listed by name in [the runbook](V071_STAGING_E2E_RUNBOOK.md).
- Read-only Auth counts before and after the SQL corrections: **3 users / 2 email-confirmed**. The suites require **4 distinct confirmed accounts**; INVITEE maps to RACER_A.

The owner-approved reviewer and bypass restrictions are saved. The remaining prerequisite is provisioning and confirming four test accounts through the supported Auth flow, followed by an approved secure credential handoff from their intended owners. Current tools cannot supply that step autonomously. No password recovery, Auth-table writes, minted user sessions, magic-link helpers or confirmation bypass was used.

## Bugs reproduced and fixed

| Area | Reproduced behavior | Correction |
| --- | --- | --- |
| Competition results | Captain could INSERT their own result as `accepted` or `rejected` | INSERT RLS accepts only `pending` / `submitted`; organizer moderation remains available |
| Competition organizer | Organizer disqualification failed because unqualified `status` inside the policy resolved to the parent competition status | Explicitly qualify `competition_teams.status` in UPDATE policy |
| Competition state | Captain could undo disqualification; withdrawn teams could rejoin finished/cancelled competitions | Organizer-only reversal and registration-state guards |
| Competition identity | Team/result system fields and competition identity timestamps could be changed | Immutable identity and audit-field triggers |
| Competition capacity | Organizer could reduce capacity below already registered teams | Reject reductions below registered count; preserve parent `FOR UPDATE` lock for last-slot insertion |
| Meetup table privileges | All four tables inherited unnecessary DELETE/TRUNCATE/TRIGGER/REFERENCES rights | Grant only SELECT/INSERT/UPDATE where required; messages get SELECT/INSERT. Existing RLS retained |
| Edge request validation | JSON null crashed both handlers; non-object request bodies were not safely rejected | Return HTTP 400 before quota/provider work |
| Weather validation | Booleans and arrays were coerced into numeric coordinates; malformed upstream envelopes could crash or look successful | Strict coordinate/city types; validate response envelope, numeric temperature/pressure and description; malformed upstream returns 502 |
| Grok diagnostics | Raw upstream error body could be persisted in the user-readable journal | Persist only fixed HTTP/timeout/generic error codes; do not read provider error bodies |
| Dependency/CI setup | Supabase dependency was declared but absent from frozen lockfile; feature-only workflows lacked a manual launch path | Pin frontend Supabase client to `2.118.0`, repair lockfile, require frozen install, add narrowly scoped request-file push trigger |

The privilege correction is least-privilege hardening; it does not claim a proven REST-based TRUNCATE exploit. Internal competition trigger functions also have PUBLIC/anon/authenticated EXECUTE revoked. No new client-callable privileged helper was introduced.

## PostgreSQL evidence and applied migration mapping

The SQL suite loads the real baseline and corrective SQL into a disconnected in-memory PostgreSQL fixture using dev-only `@electric-sql/pglite` **0.5.14**. Four synthetic UUID identities and local test roles exercise actual policies, triggers and grants. It uses no Supabase URL, real Auth record, password, session or JWT. The dependency is exactly pinned; the repository's 24-hour package-age safeguard and exclusion list are unchanged.

Before corrections, the first 30 SQL cases produced **17 failures / 13 passes**; these are failing assertions, not 17 distinct defects. After corrections and additional state/idempotence cases, **34/34 PASS**. Coverage includes organizer/captain/outsider permissions, result moderation, immutable fields, closed registration, sequential final-seat enforcement, meetup privacy before/after acceptance, destructive privilege denial, and AI claim/cache/null-token/replay/expiry checks. Both corrective migrations can be reapplied locally without changing fixture rows.

This fixture has one database connection. It does **not** prove concurrent locking under two live sessions, real JWT RLS mapping, hosted Auth behavior or provider integrations.

| Source created through Supabase CLI | STAGING migration-history version | Result |
| --- | --- | --- |
| `supabase/migrations/20261102231910_competition_state_integrity.sql` | `20261102232733 competition_state_integrity` | Applied successfully |
| `supabase/staging/20261102231917_meetup_table_privilege_hardening.sql` | `20261102232745 meetup_table_privilege_hardening` | Applied successfully |

The connector assigned remote application timestamps; this table preserves the mapping without rewriting migration history. The meetup correction stays in `supabase/staging`, because its foundation is outside the generic migration chain. Apply it only after the existing meetup foundation, integrity and RPC-grant hardening scripts.

Post-application catalog readback confirmed the corrected policies, intended meetup grants, and no anon/authenticated EXECUTE on the five internal competition trigger functions. All seven competition/meetup tables had **0 rows before and after**. Auth counts remained **3 / 2 confirmed**. No live fixtures or user data were created or modified by these corrections. Read-only log/advisory review was completed before changes; the security advisory set remained unchanged afterward. Existing self-scoped membership/profile helper grants were reviewed and retained because the current RLS/UI uses them.

## Edge verification

The offline suite covers malformed requests, missing/invalid/anonymous authentication, numeric zero coordinates, upstream error statuses and malformed payloads, timeout, weather rate limit, AI lease contention/failure cap/cache, failed completion, successful completion and redaction of raw provider diagnostics. Host/Auth/RPC/provider responses are mocked. **49/49 PASS**.

Both STAGING deployments were read before replacement and matched the previous feature sources. After replacement, both were ACTIVE v4, JWT verification remained enabled, and exact source readback matched. Real unauthenticated POST checks against both URLs returned 401. No authenticated handler or paid provider request was performed.

The prepared real-JWT scripts now include the JSON-null and non-numeric weather-coordinate regressions plus competition moderation, disqualification, capacity and closed-registration checks. Syntax checks PASS; those additions have not been executed against real users.

## Local validation

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile` | PASS, Bun 1.4.4; no lockfile changes required |
| `npm test -- --maxWorkers=2 --reporter=dot` | PASS, 148 tests / 12 files after synchronizing the client/chat follow-up with the remote branch |
| `bun run build` | PASS, client + SSR + Nitro; no application deployment |
| `node scripts/check-migration-versions.mjs` | PASS for new conflicts; 3 known historical collision groups remain for separate reconciliation |
| `node scripts/check-meetup-guards.mjs` | PASS, static only |
| Syntax checks for competition, both meetup and Edge E2E scripts | PASS |
| Prettier + ESLint for new/changed test files and helpers | PASS |
| STAGING function readback + unauthenticated gateway rejection | PASS; does not count as authenticated live E2E |

## Client/chat follow-up before the local pilot

The current product scope and pilot sequence are defined in [the current source of truth](ZAPRUDA_CURRENT_SOURCE_OF_TRUTH.md). This section records technical evidence only.

- Removed the browser client's implicit production URL/key fallback. Missing configuration now fails before client initialization; development, localhost and recognized staging/preview contexts reject the known production project. The existing Netlify preview pin remains on STAGING. Server-only secret keys are rejected without echoing their values. Tests cover the actual lazy-client entry point as well as configuration validation.
- Meetup chats now request the latest 100 messages and display them chronologically; direct messages do the same for the latest 200. Older-message pagination is still pending.
- Open meetup chats refresh every 10 seconds while visible and on focus/visibility return. Refreshing messages or sending a message preserves unsaved private-place/time edits. No Realtime publication or database configuration was changed.
- Request guards discard late responses after switching chats. Membership is rechecked during message refresh; revoked access clears cached messages and private meeting details.
- Meetup `datetime-local` now displays local wall time rather than sliced UTC. Minute-precision save round trips are covered for Moscow, Almaty and New York, including UTC date boundaries and invalid input.
- Six component tests use synthetic in-memory transport, not Supabase users or hosted RLS. Together with 18 configuration and six time cases, the full local suite is **148/148 PASS**. Targeted ESLint, preview-isolation checks, meetup static guards and `git diff --check` also pass. `npm run build` passes without deployment.
- Full `tsc --noEmit` remains **FAIL: 45 existing diagnostics, zero in the changed source/test files** with the checked-in route tree. Build-generated route-tree churn was excluded from this patch. Separate route maintenance is required: generation nests existing admin child routes under a parent without an Outlet; this follow-up does not claim those pages have been verified.
- Local browser screenshot execution could not start: the available Playwright installation lacked Chromium, and its browser download failed. The existing isolated GitHub browser-smoke job now includes **390 px**, captures all tested widths, and retains screenshots for seven days. Results/artifacts must be checked on this patch's exact commit; adding capture is not evidence of a successful run. The anonymous communities smoke does not validate authenticated chats.
- Read-only STAGING recheck still returned **3 Auth users / 2 confirmed**. Browser readback still showed **zero `staging-e2e` secrets**. No accounts, passwords, schema, Edge deployments, payment settings or production data were changed in this follow-up. The four authenticated functional E2E gates remain **0/4 confirmed PASS**.
- Revalidated on 03.11.2026 after merging the current remote branch without rewriting history: **148/148 tests PASS** with two Vitest workers (8.86 s), meetup static guards/migration audit/diff checks PASS, and a fresh read-only Auth count remains **3 / 2 confirmed**. The unrestricted local test run hit two 5 s timeouts (one existing Edge case and one chat case); the bounded run changed neither assertions nor timeout thresholds. GitHub build/browser results must be checked on the published commit separately.

## Actual Actions execution

The branch-only request file successfully launched all three suites at source SHA **`4b5d03fd02873e69c7b65cd91f0f4a8649166c64`**:

| Run | Result | Evidence |
| --- | --- | --- |
| [Quality](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539328958) | SUCCESS | Frozen install, unit tests and build on that SHA |
| [Docker smoke](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539328934) | SUCCESS | Isolated image build and HTTP smoke on that SHA |
| [Competition JWT E2E](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539320765) | GitHub FAILURE; functional E2E BLOCKED | Missing publishable key; stopped before sign-in/fixtures |
| [Meetup JWT E2E](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539320818) | GitHub FAILURE; functional E2E BLOCKED | Missing protected KEY; JWT/capacity steps SKIPPED |
| [Grok/OpenWeather JWT E2E](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539320952) | GitHub FAILURE; functional E2E BLOCKED | Missing publishable key; stopped before sign-in/provider calls |

All failed logs were read. No JWT, provider call or fixture was produced by those runs. The previous handler checkpoint `db0d0668819b20e9e6c2a24c5589cd582545357c` also passed [quality](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41542858818) and [Docker smoke](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41542858866).

These historical checks apply only to the listed SHAs. Check the newly published feature commit's own [PR checks](https://github.com/SergeyGalkin91/zapruda1/pull/63/checks); its exact run URLs are supplied in the delivery response. The E2E request marker was not changed again to repeat known configuration failures.

## Readiness and cleanup

The original stage uses **8 equally weighted verification gates**: frozen installation, unit tests, build, complete protected environment with four confirmed users, competitions JWT E2E, meetup JWT E2E, live Grok E2E, and live OpenWeather E2E.

**3/8 = 37.5%, rounded to 38% verification readiness.** Additional offline/security checks strengthen those gates; they do not substitute for the missing live evidence. This is not a percentage of all application functionality or release approval. The four requested live functional E2E gates have **0/4 confirmed PASS**.

No STAGING fixtures were created, so no data cleanup was required. Local SQL fixtures were rolled back and their in-memory database closed. Future real runs print their QA competition/meetup fixture IDs for authorized, narrowly scoped cleanup; preserve evidence before removing only those fixtures. The payment-provider stub remains outside this score.
