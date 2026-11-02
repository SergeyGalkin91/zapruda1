# Stage 7 — Grok API (Выйти на воду)

## Что сделано
- Edge Function: `supabase/functions/zapruda-daily-advice`
- Клиент уже вызывает `supabase.functions.invoke("zapruda-daily-advice")` в `/assistant`
- Таблица: `ai_daily_advices` (1 совет / день по Москве, RLS только SELECT своим)

## Секреты (Supabase Dashboard → Edge Functions → Secrets)
- `XAI_API_KEY` — ключ с https://console.x.ai
- опционально `XAI_MODEL` (по умолчанию `grok-3-mini`)
- опционально `XAI_API_BASE` (по умолчанию `https://api.x.ai/v1`)

## Деплой STAGING
```bash
supabase functions deploy zapruda-daily-advice --project-ref yudtbifopfnjtjanaqrd
# применить миграцию 20261102170000_ai_daily_advices_grok.sql на STAGING
```

## Безопасность
- Ключ только в Deno.env, не в VITE_*
- Клиент не пишет в `ai_daily_advices` напрямую
- Лимит: unique (user_id, advice_day) + до 3 failed attempts
