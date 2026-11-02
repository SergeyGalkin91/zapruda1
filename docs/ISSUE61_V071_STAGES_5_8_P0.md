# Issue #61 — P0 readiness for stages 5–8 (v0.7.1)

Base: `release/v0.7.1-integration-20261102` (PR #60). Do not merge to main / production without review.

## A. Competitions
- Migration `20261102162000_competition_team_limit_for_update_p0.sql`
- Team limit uses `SELECT … FOR UPDATE` on competition row (serialize last seat)
- Team/result UPDATE policies use `WITH CHECK` (no silent competition_id/captain_id change)
- Trigger enforces result.competition_id = team.competition_id
- UI: trackable `src/routes/competitions.tsx` (no .z64)

## B. Guides
- Migration `20261102161000_guide_payment_contact_lock_p0.sql`
- Clients cannot set inquiry/quote to paid or unlock contacts (trigger + role check)
- `mark_guide_booking_paid_from_provider` is **service_role only**
- Edge Function `supabase/functions/guide-payment-webhook`:
  - requires `GUIDE_PAYMENT_WEBHOOK_SECRET` (header `X-Zapruda-Webhook-Secret`)
  - timing-safe compare; rejects short secrets
  - calls RPC only after signature check
  - does **not** invent payment success without provider event

## C. Grok API
- Source: `supabase/functions/zapruda-daily-advice/index.ts` (trackable, not .z64)
- JWT required; anonymous rejected
- Writes via service_role; clients SELECT-only on `ai_daily_advices`
- Quota: unique (user_id, advice_day) Moscow day; max 3 failed attempts
- Secrets: `XAI_API_KEY`, optional `XAI_MODEL`, `XAI_API_BASE`
- Unit tests: `src/lib/ai-advice-quota*.ts`

## D. OpenWeather
- Source: `supabase/functions/openweather-current/index.ts`
- JWT required; key only in Deno.env (`OPENWEATHER_API_KEY`)
- City or lat/lon; response `report_fields` without forcing GPS into client storage
- Unit tests: `src/lib/weather-units*.ts` (hPa→мм рт.ст., ветер)

## Deploy (STAGING only)
```bash
# migrations on STAGING project yudtbifopfnjtjanaqrd
supabase functions deploy zapruda-daily-advice --project-ref yudtbifopfnjtjanaqrd
supabase functions deploy openweather-current --project-ref yudtbifopfnjtjanaqrd
supabase functions deploy guide-payment-webhook --project-ref yudtbifopfnjtjanaqrd
# Edge secrets: XAI_API_KEY, OPENWEATHER_API_KEY, GUIDE_PAYMENT_WEBHOOK_SECRET
```

## Verified in this PR (code/unit)
- Migrations present and policies written with WITH CHECK / FOR UPDATE
- Edge Function sources committed as TypeScript
- Unit tests for quota helpers and weather units

## NOT verified without STAGING JWT / live keys
- Concurrent two-team last-slot race under real Postgres isolation + two JWTs
- Live xAI / OpenWeather E2E
- Real payment provider webhook (YooKassa etc.) signature
- Full browser E2E contacts unlock after paid

## Rollback
Revert this branch; drop new triggers/functions on STAGING if applied.
