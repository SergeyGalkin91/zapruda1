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

## Инвентаризация исходников

Source scan перед финальной публикацией: 2 legacy xAI server files; 6 regression/unit files с legacy упоминаниями; 2 legacy E2E scripts; 5 workflow/marker files; 2 исторические применённые миграции; 16 документов на исходном срезе. Новые документы объясняют текущую миграцию и не объявляются активными вызовами. В пользовательских runtime `src` названия Grok удалены; тестовые старые error codes сохранены для проверки безопасного отказа действующего маршрута до cutover.

`GROK_WORKFLOW.md` теперь явный указатель на архив; исходные инструкции о grok/* и PR в main перенесены в `docs/archive/GROK_WORKFLOW_20261030.md`. `PROJECT_STATUS.md` помечен историческим срезом 02.11; README указывает на актуальные readiness/acceptance. Старые инструкции не конкурируют с утверждённым MASTER TASK 04.11.

Остаётся необязательный Lovable editor error hook, используемый только при наличии внедрённого editor API; сборка/SSR от него не зависят. Опубликованный проект не удалён. Удаление этого hook отдельно от опубликованного проекта не является частью подтверждённого hosting cutover.
