# v0.7.1 STAGING E2E — owner checklist

Scope: **STAGING only**, Supabase `yudtbifopfnjtjanaqrd`; no production or main changes.

## One-time protected GitHub configuration

In GitHub repo Settings → Environments → `staging-e2e` → **Environment secrets** add the following as separate *secrets* (never in chat, commits, PR comments or logs):

- `ZAPRUDA_E2E_PUBLISHABLE_KEY` — STAGING public publishable key (`sb_publishable_...`).
- `ZAPRUDA_E2E_OWNER_EMAIL`, `ZAPRUDA_E2E_OWNER_PASSWORD`
- `ZAPRUDA_E2E_SEATED_EMAIL`, `ZAPRUDA_E2E_SEATED_PASSWORD`
- `ZAPRUDA_E2E_RACER_A_EMAIL`, `ZAPRUDA_E2E_RACER_A_PASSWORD`
- `ZAPRUDA_E2E_RACER_B_EMAIL`, `ZAPRUDA_E2E_RACER_B_PASSWORD`

**Environment variable** (not secret): `ZAPRUDA_E2E_STAGING_URL` = `https://yudtbifopfnjtjanaqrd.supabase.co`.

**Important:** all suites now use **four** distinct STAGING users: OWNER, SEATED, RACER_A and RACER_B. The meetup two-JWT workflow maps its INVITEE role to RACER_A credentials; the concurrent race remains four separate JWTs. Never reuse one user across roles within the race itself.

GitHub Actions → select each manual workflow → Run workflow → choose branch. Competition and Edge workflows are restricted to `fix/issue61-v071-p0-stages-5-8`; meetup workflow is restricted to `release/v0.7.1-integration-20261102`. Protected `staging-e2e` environment may require explicit approval.

- `v0.7.1 Competitions real-JWT STAGING race (manual)` → final team slot, captain spoofing, immutable owner.
- `v0.7.1 Live Edge JWT STAGING E2E (manual)` → JWT gateway rejection, live OpenWeather, xAI daily cached quota; **consumes one daily AI advice for OWNER**.
- `v0.7.1 Meetup real-JWT STAGING E2E (manual)` → private chat and last seat on integration branch.

Record the real job URL, exact commit SHA, outcome and cleanup IDs in PR #63. Tests may leave `QA_COMP_RACE_...` / `QA_MEETUP_...` fixtures; clean up only known test records through authorized STAGING tooling after preserving evidence.

**Fail conditions:** missing credentials, unconfirmed email, non-STAGING origin, API secrets not configured, xAI daily quota already consumed, failed HTTP response, rejected last-seat race. Do not mark tests as PASS unless a real GitHub job completed successfully.

Payment provider verification (authentic signed notification, booking/amount/currency/idempotency) is not implemented. Webhook must remain fail-closed; payment functionality remains out of alpha scope until independently implemented and tested.
