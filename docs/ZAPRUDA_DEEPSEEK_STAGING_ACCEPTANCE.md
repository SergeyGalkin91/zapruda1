# DeepSeek STAGING acceptance — 04.11.2026

Канонический PR #93. Primary: DeepSeek V4.1 Flash (`deepseek-v4.1-flash`), backup YandexGPT Pro 5.1 (`yandexgpt-5.1`); URI строится на сервере из folder ID. Официальные модели/Completions auth проверены по текущим docs Yandex AI Studio. Web Search первоначально выключен.

## Реализовано в кандидате

Отдельная JWT canary, confirmed user, STAGING-only; no-billing diagnose с неизменной дневной квотой и без вывода ключей. Авторизация `Api-Key` + документированный `OpenAI-Project`; фиксированный Yandex host. Ответ ограничен 128 KiB, проверяется совпадение фактического model с запрошенным. Только одна резервная попытка для timeout/429/5xx; 401 и неверная модель не маскируются fallback. Общий бюджет upstream 40 секунд. При ошибке complete RPC получает failure, успех возвращается только после подтверждённого сохранения.

Кэш готового ответа и atomic claim/complete RPC сохранены. Тест canary делает конкурирующие запросы и требует ровно одного нового успешного ответа, последующего ready journal и неизменного cached repeat. OWNER проверяет DeepSeek, SEATED — реально вызываемую backup модель через STAGING-only `verify_fallback`; это та же дневная квота, без изменения ключей/сброса лимита и без произвольного client model. Автоматический переход primary→backup при искусственном 503 проверяется offline, не выдаётся за реальную аварию провайдера.

## Hosted gate

Workflow `yandex-canary-staging.yml` → защищённый environment `staging-e2e`. Использует существующие account secrets; Yandex key остаётся только в Supabase. Проверяет отсутствие JWT, confirmed login, read-only diagnose, настоящий upstream primary и backup, model, persistence/cache/concurrency, RLS журнала и отдельную OpenWeather.

До фактического результата соответствующего запуска: реальный DeepSeek и YandexGPT **НЕ ПОДТВЕРЖДЕНЫ**. Локальный diagnose «ready» подтверждает только конфигурацию, не IAM, ключ, биллинг или генерацию. Если quota уже занята, тест фиксирует BLOCKED; другой аккаунт ради обхода лимита не подбирается и квота не сбрасывается.

## Cutover и rollback

Исходный `zapruda-daily-advice` остаётся legacy v14. После действительных PASS требуется отдельное разрешение владельца на STAGING cutover. Перед ним сохранить version/source fingerprint и зависимости XAI. При rollback возвращается исходная функция; новые приватные фото ACL остаются закрытыми, координатные GRANT назад не открываются. Production не затрагивается.

Россия без VPN: BLOCKED до измерения физическим браузером на российском мобильном интернете цепочки frontend → Auth → Edge → Yandex → UI; фиксировать оператор/время/статусы/задержки, не API key и не GPS. Результат международного GitHub runner этим измерением не считается.

## Фактический результат текущей сессии

**DONE:** canary v2 ACTIVE, JWT true, оба файла проверены readback; 41 offline provider/handler тест поверх сохранённых legacy проверок; Deno и все 12 обычных CI на 3bcade1 PASS. Новая правка root-session safety не меняет provider-код.

**BLOCKED:** protected run 41736781269 остановлен до runner в обеих попытках, ни diagnose, ни generation не исполнялись. Подробность в двух GitHub Annotations, недоступных текущему подключению. Нужен их текст для точного действия. Не утверждаем, что Yandex key/folder, IAM, баланс, primary или backup работают/не работают. No-quota diagnose, actual upstream, ready journal и concurrency/cache остаются открытыми gates.

**NOT STARTED:** STAGING original-route cutover (нужно отдельное разрешение после PASS), отключение зависимых XAI secrets, Web Search acceptance, измерение российским мобильным оператором без VPN.

## Независимая проверка core pilot

Новый protected pilot-staging-jwt workflow проверяет actual report/chat/profile/photo/Realtime и **отдельный OpenWeather**, не обращаясь к ИИ и не расходуя его дневную квоту. Он не является подтверждением DeepSeek/YandexGPT и не переключает original route. Причина старого pre-run Yandex failure по-прежнему требует текста Annotations; новую ротацию ключа/подбор аккаунта/сброс квоты не выполнять.
