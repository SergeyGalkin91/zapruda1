# v0.7.1 STAGING E2E checkpoint — 2026-11-03 (Europe/Moscow)

Scope: PR #63, branch `fix/issue61-v071-p0-stages-5-8`, STAGING `yudtbifopfnjtjanaqrd`. No production/main writes, merges, design changes or schema changes were performed in this checkpoint.

## Work completed

- Signed in to GitHub through its secure browser authentication flow.
- Created GitHub Environment `staging-e2e` through the browser.
- Saved exactly two allowed **branch** rules: `fix/issue61-v071-p0-stages-5-8` and `release/v0.7.1-integration-20261102`; zero allowed tags. `main` has no matching rule.
- Saved the non-secret environment variable `ZAPRUDA_E2E_STAGING_URL` with the STAGING URL.
- Found and fixed a reproducible installation failure: the declared Supabase client was absent from `bun.lock`. Pinned the currently resolved client to `2.118.0`, added its dependency closure to the lockfile, and made quality CI use `bun install --frozen-lockfile`.
- Added a narrowly scoped branch push trigger for `.github/staging-e2e-request.txt` to all three E2E workflows. Meetup tests can now run on the same feature SHA as competitions and Edge tests. This does not alter the repository default branch or register anything in main.
- Corrected the stale five-account instruction. All suites need four accounts; INVITEE maps to RACER_A.

## Checks executed locally

| Gate | Result |
| --- | --- |
| `bun install --frozen-lockfile` | PASS after lockfile correction (Bun 1.4.4) |
| `bun run test` | PASS: 52 tests, 8 files (including 17 offline handler regression tests) |
| `bun run build` | PASS: client, SSR and Nitro output generated locally; no deployment |
| Migration filename audit | PASS for new collisions; 3 pre-existing collision groups still require separate reconciliation |
| Meetup static safeguards | PASS; this is explicitly not real JWT or concurrency E2E |
| Parse all 3 E2E YAML files | PASS |

Before these changes, exact feature SHA `76be539c2749b03296d012a54f452ae2e2663efd` had quality and Docker smoke checks SUCCESS. Those results do not prove this new commit. Check the new commit's own Actions results before promotion; E2E runs stopped on missing protected configuration must be recorded as BLOCKED, not PASS.

## Actual GitHub Actions execution

Tested source SHA: **`4b5d03fd02873e69c7b65cd91f0f4a8649166c64`**. The branch-only request successfully started all three E2E jobs. The following are completed runs, not planned tests:

| Run | Outcome | Evidence |
| --- | --- | --- |
| [Quality](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539328958) | SUCCESS | Frozen install, unit tests and build on the tested source |
| [Docker smoke](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539328934) | SUCCESS | Isolated image build and HTTP smoke |
| [Competition JWT E2E](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539320765) | GitHub FAILURE; functional E2E BLOCKED | Frozen install passed; script stopped at `Missing ZAPRUDA_E2E_PUBLISHABLE_KEY` before signing in or creating a fixture |
| [Meetup JWT E2E](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539320818) | GitHub FAILURE; functional E2E BLOCKED | Frozen install passed; preflight stopped at `Missing protected config: KEY`; both JWT/capacity steps SKIPPED |
| [Grok/OpenWeather JWT E2E](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41539320952) | GitHub FAILURE; functional E2E BLOCKED | Frozen install passed; script stopped at `Missing protected setting ZAPRUDA_E2E_PUBLISHABLE_KEY` before signing in or invoking either provider |

All three failed job logs were read. They confirm configuration failures, not failures in the tested competition, meetup, AI or weather business logic. No JWT, provider request or test fixture was produced by these runs. No cleanup is required for these attempts. A documentation-only follow-up commit records this evidence; its own CI status must still be checked independently.

## Verified setup state and remaining blockers

1. Read-only query against STAGING `auth.users` returned **3 total users / 2 email-confirmed**. Four distinct confirmed accounts are required; no passwords or JWTs were read or changed.
2. GitHub Environment has **zero secrets**. Required secret names are in [the runbook](V071_STAGING_E2E_RUNBOOK.md). Password values cannot be recovered from Supabase Auth. Supply them directly in GitHub's secret form; never in chat, commits, comments or logs. Publishable key plus four email/password pairs = **9 secrets**. Service-role and provider keys do not belong in these jobs.
3. **RESOLVED after explicit owner approval on 2026-11-03:** the browser saved `SergeyGalkin91` as the required reviewer and disabled administrator bypass. GitHub displayed `Environment "staging-e2e" updated.` Readback shows Required reviewers ON, reviewer `SergeyGalkin91` selected, administrator bypass OFF, and the two branch restrictions intact. The earlier automatic approval rejection was resolved by the owner's explicit permission; no bypass was used.
4. The browser has no Run workflow button for the existing meetup workflow and reports the competition workflow as not found, despite the files existing on the feature branch. The opt-in branch push trigger addresses that launch limitation. It cannot supply missing credentials or replace environment protections.
5. AI and weather functions are now ACTIVE v3 with `verify_jwt=true` on STAGING; deployed source readback matches the validated files. That is deployment metadata, not evidence of configured provider secrets, a valid user request, real weather or a successful xAI answer.

## Independent handler fixes completed after protection setup

- Reproduced two unhandled exceptions in the previous sources: authenticated-handler unit calls with JSON `null` crashed while reading `city` and `location`.
- Both handlers now reject null, arrays, scalar and invalid JSON request bodies with HTTP 400 before quota RPCs or provider requests.
- OpenWeather now returns HTTP 502 for a null/array upstream envelope, missing numeric temperature/pressure, or a non-string weather description instead of crashing or returning an empty successful forecast.
- Added 17 tests executing the actual transpiled handler sources with mocked Deno host, Auth response and provider. **52 unit tests across 8 files PASS**, build PASS, E2E script syntax and test formatting PASS. These are offline tests; they do not authenticate real users or call a provider.
- Added an authenticated JSON-null regression check for both functions to the prepared real-JWT Edge E2E script. That script remains BLOCKED on missing protected credentials.
- Deployed only `zapruda-daily-advice` and `openweather-current` to STAGING. Both are ACTIVE **version 3**, `verify_jwt=true`; source readback exactly matches the fixed files. No Auth users, passwords, email confirmation, sessions, grants, schemas or production resources were modified.
- Executed two real unauthenticated HTTP POST checks against the STAGING function URLs: **both returned 401**. This verifies gateway rejection only, not the authenticated JSON-validation path, xAI generation or live weather.
- Rollback if needed: redeploy these two function sources from feature commit `968be245f2e4399971dcc5b62986c41d15990f11`, retaining `verify_jwt=true`. Do not change Auth or production.

**Remaining authentication requirement:** four test accounts provisioned and email-confirmed through the supported Auth flow, followed by an approved secure sign-in/credential handoff from their intended owners. The current tools do not provide that step autonomously. Do not use password recovery, direct Auth-table writes, administrator-minted user sessions, magic-link helpers or confirmation bypass as a substitute.
## Readiness measurement

This checkpoint uses **8 equally weighted verification gates**: frozen installation, unit tests, build, complete protected environment with four confirmed users, competitions JWT E2E, meetup JWT E2E, live Grok E2E, and live OpenWeather E2E.

The first 3 gates are closed: **3/8 = 37.5%, rounded to 38%**. This measures completed verification for the requested stage. It is not a percentage of all application functionality and is not production-release approval. The four requested live functional E2E gates have **0/4 confirmed PASS** while protected credentials are missing.

## Continuation and cleanup

Required-reviewer protection and the administrator-bypass restriction are now saved. A fresh read-only account count still shows 3 total / 2 confirmed, and the browser still shows zero environment secrets. The owner must bring STAGING to four distinct confirmed test accounts and enter the nine secrets directly into `staging-e2e`. Do not place placeholders in secret fields. Rerun the existing branch-triggered jobs or commit a fresh request-file change on the feature branch. Confirm exact SHA and preserve real job URLs and outcome for each suite.

Passing the request-file trigger or dependency installation alone never counts as live E2E. Cleanup only fixture IDs emitted by actual runs (`QA_COMP_RACE_...`, `QA_MEETUP_...`), through authorized STAGING tools after evidence is preserved. No fixtures were created by the local checks above. Do not delete ordinary user records. Payment-provider integration remains fail-closed and outside this checkpoint's readiness score.
