# v0.7.1 STAGING E2E — owner checklist

Scope: **STAGING only**, Supabase `yudtbifopfnjtjanaqrd`; no production or main changes.

## One-time protected GitHub configuration

In GitHub repo Settings → Environments → `staging-e2e` → **Environment secrets** add the following as separate _secrets_ (never in chat, commits, PR comments or logs):

- `ZAPRUDA_E2E_PUBLISHABLE_KEY` — STAGING public publishable key (`sb_publishable_...`).
- `ZAPRUDA_E2E_OWNER_EMAIL`, `ZAPRUDA_E2E_OWNER_PASSWORD`
- `ZAPRUDA_E2E_SEATED_EMAIL`, `ZAPRUDA_E2E_SEATED_PASSWORD`
- `ZAPRUDA_E2E_RACER_A_EMAIL`, `ZAPRUDA_E2E_RACER_A_PASSWORD`
- `ZAPRUDA_E2E_RACER_B_EMAIL`, `ZAPRUDA_E2E_RACER_B_PASSWORD`

**Environment variable** (not secret): `ZAPRUDA_E2E_STAGING_URL` = `https://yudtbifopfnjtjanaqrd.supabase.co`.

**Important:** all suites now use **four** distinct STAGING users: OWNER, SEATED, RACER_A and RACER_B. The meetup two-JWT workflow maps its INVITEE role to RACER_A credentials; the concurrent race remains four separate JWTs. Never reuse one user across roles within the race itself.

GitHub Actions does not currently offer **Run workflow** for these feature-only workflows. `workflow_dispatch` needs the workflow on the default branch ([GitHub documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)); do not change `main` or the default branch to enable it.

The branch-only alternative is to edit `.github/staging-e2e-request.txt` and commit that edit to **`fix/issue61-v071-p0-stages-5-8`**. That exact request file starts the three protected suites. For an Edge/provider-only retest, edit `.github/staging-edge-e2e-request.txt` on the same branch; this avoids creating new competition/meetup fixtures. Neither file contains credentials. Other pushes do not start these E2E jobs. Each suite references `staging-e2e`, keeps `contents: read`, and queues overlapping runs instead of cancelling active tests. Existing workflow runs can also be rerun from their Actions page after configuration is ready. Each new protected run still needs the configured owner review.

- `v0.7.1 Competitions real-JWT STAGING race (protected)` → final team slot, captain spoofing, immutable owner.
- `v0.7.1 Live Edge JWT STAGING E2E (protected)` → JWT gateway rejection, live OpenWeather, xAI daily cached quota; **consumes one daily AI advice for OWNER**.
- `v0.7.1 Meetup real-JWT STAGING E2E (protected)` → private chat and last seat on the same feature SHA. Manual execution on the integration branch remains allowed if dispatch becomes available.

Current checkpoint, 2026-11-03 (Moscow): **all four approved test accounts are confirmed**. The protected configuration validation and real competition/meetup Auth+REST tests passed on `91df8840ce5f409f972c94836e7b391ccaa6a928`; these validate all nine required credentials/settings without exposing values. The four-role race and two-user privacy tests passed; the three known QA parent records and their linked records were cleaned up. OpenWeather live HTTP 200 and malformed-body/JWT checks also passed in Edge attempt 3. Grok failed with provider HTTP 400 (`grok-3-mini`), with one failed daily attempt and no answer saved. Provider acceptance remains incomplete; do not replace a real answer with a mock or reset the failure quota. [PR #63](https://github.com/SergeyGalkin91/zapruda1/pull/63) records run links and the current acceptance result; the separate status file retains historical checkpoints.

Grok failures now return and persist only fixed diagnostic codes, such as `XAI_INSUFFICIENT_CREDITS`, `XAI_INVALID_API_KEY`, `XAI_MODEL_UNAVAILABLE` or `XAI_REQUEST_REJECTED`. The server may inspect at most 4096 bytes of a provider JSON error to classify HTTP 400/403; the provider body, key, team identifiers and arbitrary messages are never logged, returned or saved. The E2E failure message prints only a known diagnostic code. This does not establish that the key, billing or model caused the existing failure until the live retest reports that classification.

Record the real job URL, exact commit SHA, outcome and cleanup IDs in PR #63. Tests may leave `QA_COMP_RACE_...` / `QA_MEETUP_...` fixtures; clean up only known test records through authorized STAGING tooling after preserving evidence.

**Fail conditions:** missing credentials, unconfirmed email, non-STAGING origin, API secrets not configured, xAI daily quota already consumed, failed HTTP response, rejected last-seat race. Do not mark tests as PASS unless a real GitHub job completed successfully.

Payment provider verification (authentic signed notification, booking/amount/currency/idempotency) is not implemented. Webhook must remain fail-closed; payment functionality remains out of alpha scope until independently implemented and tested.
