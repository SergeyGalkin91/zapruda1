# Legacy cleanup — 04.11.2026

## Изменено

- Клиентские названия Grok заменены нейтральным «Совет ИИ». Асинхронный helper переименован из optional-grok в optional-ai; старые import-пути и браузерные проверки обновлены, локальный планировщик сохранён.
- Независимая сборка без пакета Lovable и с настоящим обновлённым lockfile уже в SPOT; опубликованный проект Lovable сохранён.
- Дубли #91/#94 закрыты без merge; канонические #92/#93 сохранены.
- Yandex находится в отдельной `supabase/functions/zapruda-daily-advice-yandex/`, JWT true и запрет работы вне STAGING. Действующий маршрут не заменён подготовкой к cutover.

## Сохранено до cutover

- Legacy runtime `supabase/functions/zapruda-daily-advice/index.ts` + `xai-access.ts` обслуживает действующий STAGING маршрут v14 и необходим для rollback.
- Соответствующие offline тесты и `scripts/e2e/v075-xai-live.mjs` — доказательства прежней ошибки и средство проверки rollback, а не подтверждение DeepSeek.
- `XAI_API_KEY`, `XAI_MODEL`, `XAI_API_BASE` не удалены: существующие Edge Functions/история rollback пока от них зависят. Значения не извлекались и не публиковались.
- Применённые SQL-миграции, исторические журналы и старые source SHA не удаляются.

## После отдельного разрешения владельца

После PASS настоящих DeepSeek и YandexGPT, проверки квоты/хранения, приёмки UI и одобрения STAGING cutover: заменить исходный маршрут проверенным Yandex кодом, подтвердить тот же UI реальным JWT, повторно просканировать active imports/workflows, архивировать legacy helper/tests/docs и только затем проверить возможность удаления XAI secrets. Автоматического production cutover нет.

Историческое слово Grok в журнале, SQL migration name или rollback-документе не является активным runtime-вызовом. Полный поиск `Grok|xAI|XAI_API_KEY|XAI_MODEL|XAI_API_BASE|api.x.ai|xai-access|grok` фиксируется при каждой фазе. Публичные секреты, точные GPS и содержимое личных ответов в инвентаризацию не включаются.
