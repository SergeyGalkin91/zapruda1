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
| `bun run test` | PASS: 35 tests, 7 files |
| `bun run build` | PASS: client, SSR and Nitro output generated locally; no deployment |
| Migration filename audit | PASS for new collisions; 3 pre-existing collision groups still require separate reconciliation |
| Meetup static safeguards | PASS; this is explicitly not real JWT or concurrency E2E |
| Parse all 3 E2E YAML files | PASS |

Before these changes, exact feature SHA `76be539c2749b03296d012a54f452ae2e2663efd` had quality and Docker smoke checks SUCCESS. Those results do not prove this new commit. Check the new commit's own Actions results before promotion; E2E runs stopped on missing protected configuration must be recorded as BLOCKED, not PASS.

## Verified blockers

1. Read-only query against STAGING `auth.users` returned **3 total users / 2 email-confirmed**. Four distinct confirmed accounts are required; no passwords or JWTs were read or changed.
2. GitHub Environment has **zero secrets**. Required secret names are in [the runbook](V071_STAGING_E2E_RUNBOOK.md). Password values cannot be recovered from Supabase Auth. Supply them directly in GitHub's secret form; never in chat, commits, comments or logs. Publishable key plus four email/password pairs = **9 secrets**. Service-role and provider keys do not belong in these jobs.
3. Automatic approval review rejected saving `SergeyGalkin91` as required reviewer together with disabling administrator bypass, stating that the exact reviewer and deployment-access scope had not been specifically authorized. The unsaved form was discarded. Persisted state: Required reviewers OFF, administrator bypass ON. Branch restrictions remain saved. Obtain explicit approval for that exact change; do not bypass the rejection.
4. The browser has no Run workflow button for the existing meetup workflow and reports the competition workflow as not found, despite the files existing on the feature branch. The opt-in branch push trigger addresses that launch limitation. It cannot supply missing credentials or replace environment protections.
5. AI and weather functions are ACTIVE v2 with `verify_jwt=true` on STAGING. That is deployment metadata, not evidence of configured provider secrets, a valid user request, real weather or a successful xAI answer.

## Readiness measurement

This checkpoint uses **8 equally weighted verification gates**: frozen installation, unit tests, build, complete protected environment with four confirmed users, competitions JWT E2E, meetup JWT E2E, live Grok E2E, and live OpenWeather E2E.

The first 3 gates are closed: **3/8 = 37.5%, rounded to 38%**. This measures completed verification for the requested stage. It is not a percentage of all application functionality and is not production-release approval. The four requested live functional E2E gates have **0/4 confirmed PASS** while protected credentials are missing.

## Continuation and cleanup

After approval, finish required-reviewer protection and disable bypass. Then the owner must bring STAGING to four distinct confirmed test accounts and enter the nine secrets directly into `staging-e2e`. Do not place placeholders in secret fields. Rerun the existing branch-triggered jobs or commit a fresh request-file change on the feature branch. Confirm exact SHA and preserve real job URLs and outcome for each suite.

Passing the request-file trigger or dependency installation alone never counts as live E2E. Cleanup only fixture IDs emitted by actual runs (`QA_COMP_RACE_...`, `QA_MEETUP_...`), through authorized STAGING tools after evidence is preserved. No fixtures were created by the local checks above. Do not delete ordinary user records. Payment-provider integration remains fail-closed and outside this checkpoint's readiness score.
