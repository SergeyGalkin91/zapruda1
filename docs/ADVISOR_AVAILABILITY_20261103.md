# Advisor availability — 2026-11-03

## User-visible behavior

The `/assistant` form previously depended on a successful Grok request and a
confirmed sign-in. A provider rejection left the user without advice. The form
now has two explicit actions:

- **Составить план** immediately builds an editorial fishing plan in the browser.
  The result is labeled **Источник: правила ZAPRUDA · без генерации ИИ**. It uses
  the selected fish and night/day condition, echoes the user's place and notes,
  and does not claim knowledge of actual weather, depth, fish stock or catch.
- **Добавить совет Grok** optionally calls the existing authenticated Edge
  Function. A genuine answer has its own card and **Источник: Grok · ИИ-генерация**
  label. A provider/network/auth failure or timeout keeps the local plan and form
  usable and shows a plain status message without private diagnostics.

Local planning does not call a provider, mutate a table, consume the daily AI
quota or add an AI journal entry. Inputs and the local result stay in component
memory for the current tab; signing out or switching accounts clears them. The
rules plan remains available while Auth is loading, to guests, during a Grok
request and after the server's daily success/failure quota is reached. A Grok
request has a 45-second client wait limit (including provider access checks); a timed-out server job may finish
later, so the journal can be refreshed. Server quota enforcement is unchanged.

The existing Matte Black/Electric Blue styling, routes, navigation and access
policies are preserved. This is a usable rules-based tool alongside optional AI,
not a replacement claim that the xAI credential or live AI acceptance is fixed.

## Scope boundaries

This change does not deploy an Edge Function, edit a secret, reset a quota,
change authentication or alter RLS/Storage. STAGING advice v11 was observed while
working; its separate provider preflight must be preserved. The earlier v8 Git
source has deliberately not been redeployed over that change.

Actual live OpenWeather and four-role Auth credentials have already passed.
Live Grok generation and cached-answer acceptance remain unconfirmed following
`XAI_INVALID_API_KEY`; those gates must not be replaced with synthetic results.
No production release or completion of privacy issue #67 is implied.

## Verification

Unit/component regressions cover local planning without Auth or provider calls,
invalid-key/network failures, bounded request waits, malformed payloads, daily
limits, retained inputs, successful response provenance, escaped notes, journal
failures and discarded late responses after sign-out.

`advisor-resilience.yml` runs the actual route in Firefox and Chromium at 390 and
1280 px. It checks guest planning, a synthetic signed-in provider rejection,
continued planning, source labels, no fatal alerts/private diagnostics, no page
errors or horizontal overflow, zero table writes and zero requests to real
Supabase projects. All HTTP fixtures are disconnected: the synthetic session is
not a valid hosted JWT. Screenshots and JSON are uploaded as CI artifacts. This
test is not evidence of live Auth/RLS/provider acceptance.

General retrieve variation and pike leader suggestions were checked against
Shimano's [retrieve guide](https://fish.shimano.com/en-AU/content/c/Articles/how-to/how-to-retrieve-your-catch.html),
[spinnerbait tips](https://fish.shimano.com/en-GB/news/news-listing/tips-for-fishing-with-spinnerbaits.html)
and [predator line guide](https://fish.shimano.com/en-GB/content/c/fishing-line-guide/predator-lines.html).
The plan remains a general starting procedure, not a current local forecast.
