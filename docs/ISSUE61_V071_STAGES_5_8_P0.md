# Issue #61 — P0 readiness for stages 5–8 (v0.7.1)

Base: `release/v0.7.1-integration-20261102` (PR #60). Draft PR #63. **Do not merge to main / PROD.**

## Migration chain (STAGING order)

| File | Purpose | Prerequisites | STAGING status (2026-11-02) | Rollback |
|------|---------|---------------|-----------------------------|----------|
| `20261106000000_guide_profiles_commissions.sql` | guide_profiles, guide_booking_quotes | partner_trips, partner_trip_requests, profiles | **Unknown / may be absent** | drop quotes/profiles tables |
| `20261102160000_team_competitions.sql` | competitions / teams / results + baseline RLS + immutable triggers + FOR UPDATE | auth.users | **Absent** (must apply before P0 reinforce) | drop competition_* |
| `20261102162000_competition_team_limit_for_update_p0.sql` | reinforce FOR UPDATE + immutable guards | competitions baseline | **Not applied** | drop triggers |
| `20261102161000_guide_payment_contact_lock_p0.sql` | quote payment field locks + service RPC | guide_booking_quotes | **Not applied** (was blocked: old SQL referenced missing inquiries) | drop trigger/RPC |
| `20261102170000_ai_daily_advices_grok.sql` | ai_daily_advices table | auth.users | **Applied** (RLS ON, select-only client) | drop table |
| `20261102171000_ai_daily_advice_atomic_claim.sql` | claim/complete RPCs + lease columns | ai_daily_advices | **Not applied** | drop functions/columns |

## Security fixes in this iteration

### A Competitions
- Baseline DDL included (no silent dependency on social_groups FK).
- Self-select WITH CHECK removed; immutable `competition_id` / `captain_id` / `team_id` via BEFORE UPDATE triggers.
- `SELECT … FOR UPDATE` on competitions row for last-seat serialization.

### B Guides
- Aligned with real schema `guide_booking_quotes` (no invented `guide_booking_inquiries`).
- Client cannot set paid / contacts_unlocked_at / provider_payment_id / paid_at.
- RPC requires `p_settlement_confirmed = true` and service_role.
- Webhook **fail-closed**: empty status rejected; `waiting_for_capture` not paid; without `GUIDE_PAYMENT_PROVIDER_PROOF=1` returns **501** and never writes paid. Shared secret ≠ provider proof.

### C Grok
- Atomic `claim_ai_daily_advice_slot` + `complete_ai_daily_advice_slot` (FOR UPDATE + lease).
- Edge function uses RPCs only; concurrent second caller gets `lease_held` / `already_used`.

### D OpenWeather
- Partial lat/lon rejected; 429 handled; best-effort per-user rate limit; no lat/lon in JSON response; invalid upstream JSON → 502.

## Edge secrets (names only)
- `XAI_API_KEY`, optional `XAI_MODEL`, `XAI_API_BASE`
- `OPENWEATHER_API_KEY` or `OPENWEATHERMAP_API_KEY`
- `GUIDE_PAYMENT_WEBHOOK_SECRET` (≥16)
- `GUIDE_PAYMENT_PROVIDER_PROOF` must stay unset/0 until real provider HMAC exists
- `SUPABASE_SERVICE_ROLE_KEY` (runtime)

## Verified vs not

| Check | Result |
|-------|--------|
| Code review fixes for review findings | Done in branch |
| Unit tests (quota/weather helpers) | In tree — run via `bun run test` on CI/agent |
| Live STAGING JWT last-seat race | **NOT run** (no test JWTs in this session) |
| Live xAI / OpenWeather E2E | **NOT run** (no secrets in this session) |
| Real payment provider signature | **NOT implemented** — fail-closed 501 |
| Mobile 320/375/430 visual | **NOT re-shot this pass** (no UI design changes) |

## Deploy note for ChatGPT
Apply on STAGING only after prerequisite tables exist:
1. guide baseline if missing
2. competitions baseline
3. competition P0 reinforce
4. guide payment lock
5. AI atomic claim (ai table already present)
6. deploy edge functions

Do not set `GUIDE_PAYMENT_PROVIDER_PROOF=1` until YooKassa (or chosen provider) HMAC + amount checks are real.
