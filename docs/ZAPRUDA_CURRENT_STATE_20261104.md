# Текущее состояние ZAPRUDA COMMUNITY — 04.11.2026 (Москва)

Кандидат для STAGING; main и production не изменяются. База: `release/v0.7.5-spot` на `3a43ed67c34ca3114cb6db987b546807a59c4d02`. От неё создана рабочая ветка `work/v075-consolidation-20261104`. Канонический PR миграции — #93 в SPOT, UX — #92. PR автоматически не объединяются. Точный SHA кандидата определяется head PR #93 и GitHub Actions; подтверждение STAGING cutover запрашивается отдельно после настоящих проверок.

## Подтверждённая база

- [329 тестов, TypeScript, lint и build](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41733556438): PASS на 3a43ed6. ESLint: 0 ошибок, 6 прежних предупреждений.
- Все 9 обычных workflows на 3a43ed6: PASS, включая Docker, Node SSR HTTP, browser/390 px и PostgreSQL 17.
- [Пять серий настоящих параллельных SQL-транзакций](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41733557046): PASS. Искусственные SQL-идентичности только в одноразовой CI БД; это не JWT E2E.
- [Защищённый запуск 41729999695](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41729999695), source 2bfd8cb, актуальный backend STAGING: четыре настоящих подтверждённых JWT, разграничение доступа, отрицательная загрузка улова, отсутствие сохранения отклонённой заявки — PASS.
- Там же отдельный шаг настоящего JWT фото: upload/retry/download, удаление GPS/EXIF, запрет guest/stranger, запрет прямого Storage signed URL, запрет точных GPS SELECT — PASS; очистка проверена скриптом. Тестовый отчёт был строго PRIVATE и не изображал реальный улов.
- xAI: FAIL на диагностике `XAI_INVALID_API_KEY`, account HTTP 400, quota available, quotaPreserved=true. До запроса модели не дошло; баланс/модель не подтверждены. Новое утверждённое направление — Yandex, не очередная ротация xAI ключа.

## Фактический STAGING

- `zapruda-daily-advice` v14: legacy xAI, JWT true. Не переключён на Yandex.
- `zapruda-daily-advice-yandex` v2 ACTIVE, JWT true: после deploy оба файла точно совпали с исходниками кандидата. Deno check PASS на 3bcade1 (run 41737399352 и 41737705897).
- `zapruda-spot-records` v11: отзыв подтверждения, пересчёт KING и идемпотентные решения, JWT true.
- `report-photo-upload` v7, JWT true. `report-photo-access` v2, gateway проверяет RLS/видимость и JWT для приватного доступа/DELETE; public GET имеет verify_jwt=false намеренно.
- `openweather-current` v11, JWT true, сохранён отдельно от ИИ.
- Новые применённые migration deltas: 20261103215846 `v075_report_coordinate_acl`; 20261103215853 `v075_report_photo_access_gate`; 20261103224908 `v075_spot_revocation_recalculation`.
- Последний readback после JWT photo smoke и deploy Yandex v2: 1 приватный отчёт, 0 публичных; 0 точных координат; 0 модераторов, спотов, уловов, KING и SPOT evidence; 0 производных фото. QA-отчётов не осталось; `report_photos` и оба тестируемых media buckets пусты. Таблицы `private_fishing_marks` в STAGING нет: личные метки/платная аналитика требуют отдельного выравнивания зависимостей и реальной приёмки.
- Advisors: INFO RLS без policy — 11 таблиц (в том числе закрытая internal schema); WARN guarded SECURITY DEFINER entrypoints — 11 (два новых защищённых RPC); WARN leaked-password protection — 1. Категории не устранены и не скрываются; новые RPC имеют проверку allowlist/подтверждённой почты и запрет самопроверки.

## Матрица PR и порядок

| PR | Назначение | Состояние / действие |
|---|---|---|
| #63 | Интеграция v0.7.1, 02ac98c | Открыт; изменения уже в истории SPOT; автоматически не объединять |
| #85 | SPOT, 3a43ed6 | Основная release-ветка, draft; положительный moderation E2E ещё заблокирован |
| #86 | Фото/GPS, 39d30a1 | Отдельный security gate, открыт; исходники уже в SPOT |
| #87 | Независимая сборка, d2602de | GitHub: merged в SPOT через 2bfd8cb; main не изменён |
| #89 | Legacy xAI, 81b9522 | Сохранён до успешного Yandex cutover и проверки rollback |
| #91 | Дубль UX в main | Закрыт без merge: тот же head 978fce9, что у #92 |
| #92 | UX/spec в SPOT, 978fce9 | Канонический UX PR; foundations/spec включаются в кандидата, wizard проверяется отдельно |
| #93 | Yandex в SPOT, исходный 058c0a0 | Канонический PR миграции; source продолжен без force-push |
| #94 | Дубль Yandex в main | Закрыт без merge: тот же head/ветка, что у #93 |

Остальные старые PR не закрываются по одному названию: необходим анализ зависимостей. Main-target дубль не означает, что можно автоматически удалить его ветку. Ветки #91/#94 сохранены.

## Честные ограничения

Полный KING live E2E требует разрешённого независимого модератора, юридически проверенного спота и подлинного evidence. Никого не назначали и публичные уловы не выдумывали. STREET/UL — первая волна; CARP/WINTER/BOAT не объявляются активными hosted-функциями. Пороговые trophy-значения из UX-spec остаются DRAFT, отдельного численного утверждения нет.

PROD read-only: 5 публичных отчётов, заполненных точных GPS нет; 1 legacy original photo и старая Storage SELECT policy; AI schema старее STAGING. Опасный schema/media drift остаётся P0. Перенос требует отдельного разрешения, резервной копии, обработки legacy медиа и отдельного плана миграции. SEO геоточек и SPOT MARKET закрыты до security gate.

Российские мобильные сети без VPN, полный authenticated UI, новая 320/768 px приёмка и настоящая резервная модель не доказываются обычной сборкой. Для каждого результата нужен самостоятельный evidence.

## Проверки нового кандидата перед публикацией

370/370 Vitest в 28 файлах, TypeScript, ESLint (0 ошибок, 6 прежних предупреждений), production build — PASS локально. Включены 41 offline контрактная/handler проверка Yandex поверх сохранённых 329 базовых тестов. CI и hosted smoke на новом точном SHA проверяются отдельно.

## Обновление после консолидации

- Source a8760db: отдельная canary, безопасные provider contracts, нейтральный клиент, актуальные пять документов, CSS foundations из #92. Commit 3bcade1 исправляет установку npm-зависимостей в Deno check. На точном 3bcade1 прошли все 12 обычных workflow, включая frontend/Node/Docker, фото, PostgreSQL, Deno, isolation, СХОДКИ и браузеры. Дополнительные повторные PR-triggered прогоны того же SHA не считаются отдельными функциями.
- Новая проверка безопасности обнаружила, что профиль и аналитика самостоятельно не подписывались на смену Auth. Добавлен общий AuthSessionBoundary над Outlet: меняется пользователь/выход → обнуляется QueryClient и размонтируется прежнее состояние маршрутов; тот же user при TOKEN_REFRESHED → черновики сохраняются. Пять offline UI регрессий подтверждают очистку и отбрасывание запоздавшего ответа. Это не signed-JWT E2E.
- Перед публикацией последнего safety/browser изменения локально прошли **375 тестов / 29 файлов**, TypeScript, ESLint (0 ошибок / 6 прежних предупреждений) и build. Deno/provider-код не изменился после 3bcade1; canary v2 остаётся точным readback.
- Guest visual smoke расширен на 320/390/768/1440, обе темы, Chromium/WebKit/Firefox, десять маршрутов, скриншоты и отсутствие горизонтального переполнения. Новый результат читается на точном последнем SHA; это не реальный мобильный оператор, не authenticated E2E и не pixel-perfect одобрение по отсутствующему бинарному эталону пяти телефонов.
- Source scan: credential-shaped private-key patterns не найдены; значения ключей/ответов/GPS не выводились. Это не гарантия полного исторического secret scanning. Публичные report queries используют явные безопасные колонки; private GPS table напрямую клиентом не запрашивается.

## BLOCKED: реальный Yandex

[Protected run 41736781269](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41736781269): два запуска завершились failure **до запуска runner**, steps отсутствуют и job logs не созданы. `/pending_deployments` пуст. Это не результат запроса Yandex и не доказательство неверного ключа. Check-run сообщает две Annotations; подключение не позволяет читать этот endpoint или настройки Environment. Для точного исправления нужен текст этих Annotations от владельца. Предположение о запрете ветки Environment нельзя выдавать за прочитанную причину. После устранения ограничения можно повторить только failed job: canary v2 уже развёрнута, существующие тестовые аккаунты/секреты используются без новой передачи паролей.

В этом подключении server-secret values не извлекались. Локально корректная конфигурация Yandex, IAM, баланс, реальная primary/backup, journal/cache/concurrency и текущая погода новым Yandex workflow пока **не подтверждены**: скрипт до них не дошёл. Не переключать исходный маршрут и не закрывать #89 как завершённую замену.

## P0: несовпадение frontend и isolated STAGING

Полная структурная инвентаризация: 31 public base table в STAGING против 61 в PROD; 22 используемые клиентом таблицы отсутствуют в STAGING. Через pg_class/to_regclass проверено отсутствие не только таблиц, но и совместимых views для chat_places/chat_messages/catches/comments/private_fishing_marks. [Список и последствия](ZAPRUDA_STAGING_SCHEMA_GAP_20261104.md). Поэтому публичный чат, полные отчёты/снасти и ряд дополнительных сценариев не приняты на STAGING. Production не изменён.

В report publication добавлен required-store preflight до первого INSERT: при отсутствующем catches черновик сохраняется без частичной записи. Добавлены проверки account binding и остановки поздней публикации/фото-запроса. Пять новых offline UI регрессий; итоговый набор — 380 тестов (результат конкретного последнего HEAD смотреть в Actions). Никакой новой schema migration этим safety-изменением не применялось.

На предыдущем source 6598d6c расширенный [visual run 41739546750](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41739546750) полностью PASS: Chromium/WebKit/Firefox, 320/390/768/1440, обе темы, десять маршрутов, screenshots/overflow/errors. Гостевой placeholder не подтверждает работающую БД — schema gap найден отдельно.

## Продолжение выравнивания схемы — 04.11.2026

Последующая сверка обнаружила уже применённые дельты catches/comments (20261104000548/000608) и geographic text chat (20261104001134): прежние 31/22 — исторический срез. Эти дельты приняты как baseline и повторно не накладываются. Подготовлены атомарное report+catch сохранение с retry receipt, защищённые chat photos без прямого Storage signing, private gear/marks и необходимые profile aggregates/activity. [План, контракты, rollback и фактические gates](ZAPRUDA_STAGING_SCHEMA_ALIGNMENT_20261104.md). Состояние новых hosted deploy и точный CI смотреть в evidence этого документа; подготовленные SQL/скрипты сами по себе не являются PASS.
