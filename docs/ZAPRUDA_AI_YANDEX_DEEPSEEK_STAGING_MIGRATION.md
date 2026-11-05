# ZAPRUDA: миграция ИИ в Yandex AI Studio — 04.11.2026

Статус: draft PR #93 → `release/v0.7.5-spot`. Рабочая консолидация начата от SPOT `3a43ed6`, без merge PR, main, production и переключения действующего маршрута. Дизайн v0.6.0-admin-rc.1 сохраняется. Приложение — v0.7.5 SPOT, не прежняя версия v0.7.1.

## Модели и server secrets

| Назначение | Конфигурация |
|---|---|
| Primary | `gpt://{folder_id}/deepseek-v4.1-flash` |
| Backup | `gpt://{folder_id}/yandexgpt-5.1` |
| Search | OFF; отдельная приёмка данных, источников и стоимости перед включением |
| Secrets в STAGING Supabase | `YANDEX_AI_API_KEY`, `YANDEX_AI_FOLDER_ID`, `YANDEX_AI_PRIMARY_MODEL=deepseek-v4.1-flash`, `YANDEX_AI_FALLBACK_MODEL=yandexgpt-5.1`, `YANDEX_AI_WEB_SEARCH_ENABLED=false` |

Значения ключей не передавать в чат, browser VITE variables или GitHub source. Проверить права service account `ai.languageModels.user` и API-key scope `yc.ai.foundationModels.execute` в нужном каталоге; наличие локально корректной конфигурации не подтверждает IAM/ключ/биллинг.

Официальный Completions endpoint: `https://ai.api.cloud.yandex.net/v1/chat/completions`, `Authorization: Api-Key ...`, `OpenAI-Project` с folder ID. URI и модели сверены с текущей документацией. DeepSeek V4 Flash и YandexGPT Lite 5 объявлены устаревшими на 15.11.2026; в кандидате явно V4.1 Flash и Pro 5.1.

## Разделение runtime и canary

- Новый кандидат находится в `supabase/functions/zapruda-daily-advice-yandex/{index.ts,yandex-provider.ts}`; JWT true и запрет не-STAGING окружения.
- `supabase/functions/zapruda-daily-advice/index.ts` и legacy helper остаются прежними до отдельного разрешения cutover. Подготовка PR не подменяет работающую функцию.
- Read-only `{action:"diagnose"}` проверяет конфигурацию и только свою квоту, не вызывает модель, не меняет дневной слот и не выдаёт секреты. Значение ready не является upstream acceptance.
- Обычный запрос резервирует атомарный дневной slot, получает настоящий ответ с проверкой actual model и записывает ready только после complete RPC. Ошибка учитывается как failure, а не успешный совет.
- Primary timeout/429/5xx дают одну backup попытку в общем 40-секундном upstream бюджете. 401/403/неверная модель не маскируются заменой модели. Неограниченных retries нет.
- STAGING-only `{action:"verify_fallback",...normalInput}` выбирает только одобренную backup модель и использует ту же квоту. Это проверка настоящего backup ответа; автоматический переход при искусственном 503 проверяется отдельно offline, без порчи общих ключей.
- OWNER проверяет primary, SEATED — backup; чужие аккаунты для обхода лимита не подбираются. Готовый старый ответ не считается новой генерацией DeepSeek.

## Acceptance и cutover

[Полная матрица](ZAPRUDA_DEEPSEEK_STAGING_ACCEPTANCE.md). Protected workflow `yandex-canary-staging.yml` подтверждает настоящие JWT, immutable diagnose, actual primary/backup, model, persistence, cache, concurrency, RLS и OpenWeather. 370 локальных тестов, строгий TypeScript, lint (0 ошибок/6 прежних warnings) и build прошли перед публикацией этого кандидата; точный CI SHA/result смотреть в PR #93.

После фактического PASS всех hosted gates — запросить отдельное разрешение владельца на STAGING cutover. Затем выполнить вход и вызов через настоящий UI; отдельно проверить российскую мобильную сеть без VPN. Production/main, платежи, public release и published Lovable project не изменяются.

Rollback сохраняет предыдущий source/version и XAI secrets до завершения приёмки. Не открывать назад закрытые GPS/фото ACL ради rollback кода. Исторические применённые SQL не удалять. Search остаётся OFF; 152-ФЗ/внешняя обработка Web Search и реальные citations требуют отдельной проверки.

## Первичные документы

- https://aistudio.yandex.ru/ru/docs/ai-studio/concepts/generation/models
- https://aistudio.yandex.ru/ru/docs/ai-studio/operations/generation/completions-basic
- https://aistudio.yandex.ru/ru/docs/ai-studio/release-notes/deprecations
- https://aistudio.yandex.ru/ru/docs/ai-studio/concepts/agents/tools/websearch
- https://yandex.cloud/ru/docs/iam/concepts/authorization/api-key
