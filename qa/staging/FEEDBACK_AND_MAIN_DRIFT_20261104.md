# STAGING feedback storage — applied 2026-11-04

## Environment
- **STAGING only:** `yudtbifopfnjtjanaqrd`
- Migration `staging_feedback_requests_owner_read_20261104` **already applied**; do not reapply.
- PROD `sonvniuwtvzzyuglscah`, `main`, production domain and user records untouched.
- Reproduction SQL stored under `qa/staging/`, outside production auto-migrations.

## Actual checks
- `public.community_requests` was absent before, now exists.
- RLS enabled with one owner-only read policy.
- Authenticated SELECT on `subject`: true; `body` and `contact`: false.
- Anonymous SELECT on `subject`: false.
- Authenticated direct INSERT and DELETE: false.
- 0 rows; role-simulated confirmed-user read returns 0 rows.
- No grants, users, contacts, or feedback submissions created.

## Blocker not fixed by this DDL
The page `src/routes/feedback.tsx` loads a user's recent requests from `community_requests` and submits via Supabase Edge Function `submit-community-request`.
The STAGING Edge Function inventory does **not** contain `submit-community-request`. Therefore **actual submission remains BLOCKED**. Do not add direct client INSERT grants as a workaround; deploy and validate the server-side function after reviewing its auth, input checks, Telegram handling, and rate limits.

A real signed-JWT owner/stranger browser test remains necessary.

## Release/main integrity
GitHub compare `main...release/v0.7.5-spot`: ahead 380, behind 0, base `0d787d8`; `main...work/v075-consolidation-20261104`: ahead 409, behind 0. `main` last commit recorded 2026-10-31 18:15:48 UTC. Do **not** merge draft or staging-only DDL to `main` as a substitute for release gating.
