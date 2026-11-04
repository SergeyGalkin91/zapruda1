# Текущее состояние — ZAPRUDA v0.7.5 SPOT, 04.11.2026

**NO-GO публичному запуску.** Основная рабочая версия продолжена в существующем [PR #93](https://github.com/SergeyGalkin91/zapruda1/pull/93) → `release/v0.7.5-spot`; head-ветка `feat/ai-yandex-deepseek-staging` зеркалируется в `work/v075-consolidation-20261104`. Точный актуальный SHA — head этого PR. Main/production/DNS/платежи/публичный релиз не изменялись. Дизайн `v0.6.0-admin-rc.1`, обе темы и пять вкладок сохранены.

## DONE: изменения и фактический STAGING

- `35a18f8`: атомарное сохранение отчёта с уловом, повтор запроса без дубликата после потерянного ответа/перезагрузки, привязка к captured JWT; фото чата через обработку и JWT gateway вместо оригинала в Storage/signed URL; приватные зависимости профиля; SQL/QA/workflows.
- `d58836c`: сохранена последующая уже применённая gear-миграция; исправлена обнаруженная Deno типизация writer. Ничего не пересоздавалось и история не переписывалась.
- Продолжение в текущем HEAD: обновление сообщений/фото/реакций без потери черновика, освобождение Blob URLs, поздняя отправка после unmount запрещена; Realtime publication только четырёх RLS-таблиц; семь недостающих полей поиска напарников; покрывающие индексы трёх новых FK.
- STAGING `yudtbifopfnjtjanaqrd`: **42 public tables**, все с RLS. Предыдущий срез 31/22 — исторический. Приняты и не переиграны уже появившиеся миграции 20261104000548, 000608, 001134 и 002109.
- Применены семь новых точечных дельт. Текст каждой прочитан из migration history и точно совпал с файлом. [Версии, контракты, rollback](ZAPRUDA_STAGING_SCHEMA_ALIGNMENT_20261104.md).
- `chat-photo-upload` v1 и `chat-photo-access` v1 ACTIVE / JWT=true. Все пять файлов обеих функций точно совпали с исходниками при readback. Private JPEG-only bucket 5 MiB; клиент не может зарегистрировать исходное фото или получить прямой Storage token.
- `zapruda-daily-advice-yandex` v2 остаётся отдельной canary; оригинал `zapruda-daily-advice` v14 остаётся legacy. SPOT v11, report upload v7/access v2, OpenWeather v11 сохранены.
- После DDL: 0 публичных отчётов, 0 catches/comments/chat messages/chat photos/private marks, 0 новых fake public records. Существующий приватный отчёт не копировался/не удалялся. Последующий JWT QA обязан отдельно доказать очистку.

Отчёт без улова **не зависит от catches/RPC**. Для отчёта с уловом preflight сохранён; report+catch+retry receipt выполняются одной invoker-транзакцией с исходной RLS. Любая ошибка улова откатывает отчёт. Текст черновика остаётся в per-account localStorage, фотографии туда не сохраняются. После сохранения значения формы замораживаются на время повторной загрузки.

## Проверки: различать уровни доказательств

- Локально текущие исходники: **405 тестов / 32 файла**, TypeScript, lint (0 ошибок / 6 прежних предупреждений), build и migration-version audit PASS. Из них 20 изолированных SQL-тестов и 3 новые настоящие component-регрессии чата; это **не JWT**.
- На точном `d58836c` прошли все шесть запущенных scoped CI: [quality/400](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41747680371), [Docker](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41747680552), [PostgreSQL17 + Deno обеих photo entrypoints](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41747680477), [три браузера/четыре ширины/обе темы](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41747680365), Yandex Deno и advisor resilience.
- PostgreSQL: отдельные соединения, 5 серий конкурентных retry/place requests, один primary kit, catch failure rollback, empty rollback/reapply и отказ уничтожить заполненные данные. Искусственные SQL-идентичности только в одноразовой БД.
- Для итогового HEAD общий validation marker запускает все **13 обычных workflows**, включая standalone Node, photo browsers, SPOT PostgreSQL, СХОДКИ и preview isolation. Читать фактические результаты в [Checks PR #93](https://github.com/SergeyGalkin91/zapruda1/pull/93/checks); предыдущий зелёный SHA не выдавать за новый.
- Новый `pilot-staging-jwt.yml` использует существующие четыре confirmed account secrets в защищённом `staging-e2e`: actual report/catch/API, public→private HTTP, EXIF, чат/Realtime/photos/reactions, приватный профиль, отдельная погода и независимый SPOT negative-upload. Подготовленный/ожидающий workflow не считается PASS.
- Существующее настоящее hosted evidence: [41729999695](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41729999695) — SPOT границы и private photo HTTP PASS; xAI diagnosis отклонил credential. Это не новый полный UI/модераторский E2E.

## PARTIAL / BLOCKED

1. Полная совместимость приложения не достигнута: **11 таблиц + my_atlas_progress view + 6 клиентских RPC** отсутствуют; сохраняются отдельные guide/paid-schema различия. [Матрица 48 отношений](ZAPRUDA_STAGING_DEPENDENCY_MATRIX_20261104.md). Не принимать Atlas, взаимные follow, guide/payment/admin/feedback/spearfishing как проверенные STAGING-сценарии.
2. Настоящий DeepSeek/YandexGPT/квота/кэш/journal пока BLOCKED: [41736781269](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41736781269) дважды failure до runner, logs нет, pending_deployments пуст. Нужен **только текст двух Annotations**; ключ повторно не менять. [AI acceptance](ZAPRUDA_DEEPSEEK_STAGING_ACCEPTANCE.md).
3. Полный KING live BLOCKED: необходим разрешённый независимый модератор, законный реальный SPOT и подлинное evidence. Роли, титулы и фиктивные публичные уловы не создавались.
4. Новые JWT/UI/Realtime сценарии закрываются только фактическим protected PASS. Guest screenshots, SQL-фикстуры и readback не подменяют этот gate.
5. PROD privacy/schema drift, legacy original и old Storage policy остаются P0: отдельный backup/migration/media plan и разрешение. Точные координаты/оригиналы не переносились. Физический российский мобильный интернет без VPN не измерялся.

## NOT STARTED / отдельные разрешения

STAGING original-route AI cutover — только после настоящих primary/backup PASS и отдельного согласия. XAI secrets сохраняются для rollback. Main/production merge/deploy, DNS, публичный релиз, реальные платежи не запускать автоматически. UX-spec не равен реализации: трёхшаговый wizard, unread receipts, будущие лиги и trophy thresholds не объявляются завершёнными.

Advisors: 11 INFO RLS-no-policy (в том числе intentional deny internal tables), 13 WARN guarded SECURITY DEFINER entrypoints, 1 WARN leaked-password protection. Три новые FK warnings исправлены отдельными индексами; оставшиеся performance findings записаны в alignment report. Предупреждения не скрывались и доступ не ослаблялся ради зелёной панели.
