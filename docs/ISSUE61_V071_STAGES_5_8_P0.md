# Issue #61 — P0 readiness for stages 5–8 (v0.7.1)

Base: `release/v0.7.1-integration-20261102` (PR #60). Do not merge to main / production without review.

## A. Competitions
- Migration `20261102160000_team_competitions_p0.sql`
- Team limit uses `SELECT … FOR UPDATE` on competition row
- Team/result UPDATE policies use `WITH CHECK` (no silent competition_id/captain_id change)
- Trigger enforces result.competition_id = team.competition_id
- UI: trackable `src/routes/competitions.tsx` (no .z64)

## B. Guides
- Migration `20261102161000_guide_payment_contact_lock_p0.sql`
- Clients cannot set inquiry/quote to paid or unlock contacts
- `mark_guide_booking_paid_from_provider` is service_role only (webhook path; not simulated)

## C. Grok
- Source: `supabase/functions/zapruda-daily-advice/index.ts`
- Table migration for `ai_daily_advices`
- Unit tests: `src/lib/ai-advice-quota.test.ts`

## D. OpenWeather
- Source: `supabase/functions/openweather-current/index.ts`
- Unit tests: `src/lib/weather-units.test.ts`

## NOT verified without STAGING JWT / keys
- Concurrent two-team last-slot race under real Postgres isolation
- Live xAI / OpenWeather E2E
- Payment provider webhook signature
