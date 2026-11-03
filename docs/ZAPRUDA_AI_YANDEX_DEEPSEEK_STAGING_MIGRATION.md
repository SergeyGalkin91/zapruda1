# ZAPRUDA — approved migration from xAI Grok to Yandex AI Studio
**Status**: Source implementation in separate draft PR; deployment targets STAGING only until owner accepts real integration tests. Historical app name/version remains v0.7.1 with additions; release/v0.7.5-spot is the technical base branch. Does not change locked design v0.6.0-admin-rc.1.

## Approved model strategy
- Primary: **DeepSeek V4.1 Flash** through Yandex AI Studio; canonical URI `gpt://{folder_id}/deepseek-v4.1-flash`.
- Backup: **Alice AI LLM Flash** (current supported Russian model, rather than older YandexGPT Lite 5 which is scheduled for retirement 2026-11-15); canonical URI `gpt://{folder_id}/aliceai-llm-flash`.
- Search: Yandex AI Studio **Web Search** via `POST https://ai.api.cloud.yandex.net/v1/responses`. Configurable flag defaults to OFF until commercial/data/security acceptance. Web tool sends only a preapproved fish/time-of-day category, never personal notes, raw waterbody text, chat, paid coordinates or GPS.
- Core text completion `POST https://ai.api.cloud.yandex.net/v1/chat/completions` with `Authorization: Api-Key ...`, server-side exclusively. Fixed official domain; no user-provided base URLs.
- Existing Supabase Auth, atomic `claim_ai_daily_advice_slot`/`complete_ai_daily_advice_slot`, error retry semantics, local clock and UI surface preserved.
- The Free advisor's one successful daily call and PRO subscription are *not* conflated. This PR migrates the existing daily Edge function; it does NOT implement billing or claim that paid entitlements work.

## STAGING secret configuration (not committed)
Configure secrets in **Supabase STAGING project `yudtbifopfnjtjanaqrd` only**, not GitHub source, no client `VITE_` vars, never send keys in chat:
- `YANDEX_AI_API_KEY`: scoped Yandex service account API key, limited `yc.ai.foundationModels.execute` and least-privilege role needed for selected API.
- `YANDEX_AI_FOLDER_ID`: folder ID for the above service account and models.
- `YANDEX_AI_PRIMARY_MODEL=deepseek-v4.1-flash` (optional default).
- `YANDEX_AI_FALLBACK_MODEL=aliceai-llm-flash` (optional default).
- `YANDEX_AI_WEB_SEARCH_ENABLED=false` at first; switch to `true` only after quota, source/data protection and region/network tests.
The legacy `XAI_API_KEY`, `XAI_MODEL`, `XAI_API_BASE` are no longer used by the new function. **Do not delete existing secrets until cutover and rollback verified**.

## Functional behavior / migration gates
1. **Before deploy**: strict TS/lint/unit/build on exact PR head, no public config secrets, no production changes.
2. **Deploy canary only** as `zapruda-daily-advice-yandex` to STAGING, keeping existing `zapruda-daily-advice` unchanged until provider auth is verified. Use `verify_jwt=true`. The canary shares claim/complete RPC and daily advice table: do not use an account with already-completed daily advice as proof of a new model result.
3. **Read-only diagnostic**: authenticated confirmed account sends `{"action":"diagnose"}` to canary; response only fixed fields `configuration`, `provider`, `primary_model`, `fallback_model`, `web_search_enabled`, `quota`. A `ready` configuration only means secrets are present and locally well-formed; it **does not** prove API permission, key validity, billing or generated response. No model call and no slot consumption.
4. **True upstream smoke test**: one authorized confirmed STAGING user with available daily quota calls canary; inspect real response model, source, history; confirm no key or private fishing coordinates in logs, messages or search inputs. Verify fallback with simulated 503 separately; avoid deliberately invalidating an active key in shared staging.
5. **Web Search**: only after separate review enable flag; verify citations from real Yandex, exact fetched source links, allowed public-only query, failed search leaves AI plan functioning, no paid client photos/private content to tool. Yandex warns that Web Search operates outside the certified data system under 152-FZ.
6. **Cutover**: only after real DeepSeek and backup success and owner acceptance, deploy same function under original `zapruda-daily-advice` path on STAGING and test existing UI with real login. Do not deploy to production, alter billing, promote PR or claim that app access from Russia without VPN is proven until measured from Russian mobile networks.
7. **Rollback**: use previous Edge function version; keep old function and secrets until smoke, in-app receipt, role/security and backup tested.

## Confirmed technical constraints
- DeepSeek V4 Flash and YandexGPT Lite 5 are scheduled for withdrawal on 2026-11-15; use DeepSeek V4.1 and Alice AI Flash instead.
- A successful call returns actual `model`, `provider`, `web_search`, and verified source links when available. Existing React client can ignore additive fields; user should not be led to believe Web Search or weather were used when they were not.
- Separate externally hosted Supabase frontend and authentication still need a **from-Russia-without-VPN** connection and response-time test. Russian model hosting alone is NOT end-to-end reachability.
- Existing xAI preflight `xai-access.ts` is legacy, retained for old rollback/PR work only; no new runtime import.
- Protect prompt injection: web text is untrusted content, not instructions. The downstream model must not invoke external links itself. Verify mobile UI displays sources and provider labels in later UI PR when search is live.

## Acceptance matrix
- [ ] Code unit tests: model URI, valid DeepSeek response, bad key not retried, 503 fallback, web search failure safe, public-only query no GPS, empty response not cached as success.
- [ ] CI: exact HEAD checks, formatting, TS, Vitest, build and Docker. Real browser smoke on existing advisor unchanged.
- [ ] STAGING canary `verify_jwt=true` authentication and one actual successful model completion, with correct `ai_daily_advices` persistence.
- [ ] Failed upstream call recorded as failed, not billed as successful daily advice.
- [ ] Web search returns real citations only; no private data in web requests; no invented weather/real-time depth measurements.
- [ ] API key, folder ID, prompts, session JWT, exact GPS not logged or visible to public users.
- [ ] No staging UGC fabrication, no production schema/Edge/backend changes.
- [ ] Russian mobile network load/availability verified separately; proper error and retry UI when upstream or app host unavailable.
- [ ] Owner approves STAGING cutover and production separately.

## Authoritative documentation
- https://aistudio.yandex.ru/ru/docs/ai-studio/concepts/generation/models
- https://aistudio.yandex.ru/ru/docs/ai-studio/operations/generation/completions-basic
- https://aistudio.yandex.ru/ru/docs/ai-studio/concepts/agents/tools/websearch
- https://aistudio.yandex.ru/ru/docs/ai-studio/release-notes/deprecations
- https://yandex.cloud/ru/docs/iam/concepts/authorization/api-key
