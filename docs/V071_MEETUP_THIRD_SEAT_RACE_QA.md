# v0.7.1 — STAGING third-seat concurrency QA

New runner: `node scripts/e2e-meetups-third-seat-race.mjs`.

## Scope
- Four distinct verified disposable STAGING Auth accounts: OWNER, SEATED, RACER_A, RACER_B.
- Owner creates a disposable meetup; three users request admission.
- Owner accepts SEATED, taking occupancy to 2/3.
- Two REST updates are dispatched concurrently for the last seat.
- PASS requires exactly one accepted update, the other rejected with `MEETUP_FULL`, and exactly 3 accepted members in the database.
- Uses live Supabase Auth and PostgREST (not mocked SQL role settings). Requests are concurrently dispatched, but a single run does **not** prove systematic race freedom under repeated stress.

## Required protected configuration
`ZAPRUDA_E2E_STAGING_URL=https://yudtbifopfnjtjanaqrd.supabase.co`
`ZAPRUDA_E2E_PUBLISHABLE_KEY` (publishable only).
For each prefix `ZAPRUDA_E2E_OWNER`, `ZAPRUDA_E2E_SEATED`, `ZAPRUDA_E2E_RACER_A`, `ZAPRUDA_E2E_RACER_B`, provide `_EMAIL` and `_PASSWORD` in protected environment. Do not store values in the repository.

## Safety and operational status
- Strictly rejects all non-STAGING URLs, does not use service-role credentials, and never invokes a production endpoint.
- Fixture remains after execution for review: the log prints meetup ID. Run authorized cleanup of that disposable meetup and verify removal afterward.
- Test **added to integration branch, not run against STAGING** because protected disposable credentials were not provided.
- This is an API integration test, not a browser UI test or a verified payment flow.
- Run only after confirming the schema and RLS migrations were applied to STAGING.
- Do not merge PR #60 / release to production based on this script alone.
