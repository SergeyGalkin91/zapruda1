> Исторический срез. Актуальное продолжение и условное разрешение main: [FINAL_RELEASE_INTEGRATION](ZAPRUDA_FINAL_RELEASE_INTEGRATION_20261104.md). Protected 41850073063 теперь SUCCESS на f3bbe1b; последующая UI-правка проверяется отдельно.

# ZAPRUDA — финальная техническая приёмка 04.11.2026

Актуальное продолжение: [P0 closure](ZAPRUDA_P0_CLOSURE_20261104.md). Результаты ниже относятся к прежнему SHA; последующая приёмка и текущие блокеры имеют приоритет.

**NO-GO для main/production и выпуска 0.7.6 KING FINISH.** Техническая база остаётся 0.7.5 SPOT. Проверенный код кандидата: **2051567279592071ecad053014a6467e71805353**, PR #93. STAGING: yudtbifopfnjtjanaqrd. Ни один PR не объединён, версия/tag не повышены.

## Реальные исправления

- 8b54b53 / 03873ac: стабильный UUID отправки чата, восстановление потерянного ответа, PostgreSQL-ready unread refresh; исправлена TS2769 регрессия.
- 22f19cd: узкий STAGING INSERT(id) под существующими confirmed-actor/owner/geography RLS после настоящего Browser failure.
- f8fdb54: точное доступное имя select отчёта через aria-labelledby, component regression.
- 39770e1: no-catch публикация с сохранённым UUID и recovery только точного собственного payload; без зависимости от catches/RPC. Существующих STAGING grants достаточно, новая DDL не нужна.
- 2051567: устранена гонка uid/selectedPlace; ввод, attach и send доступны после загрузки комнаты. Regression с задержанной географией PASS.
- d41f02f / 82082ae: защищённый пустой Atlas schema contract и улучшение контраста реальных подписей. Последние темы/бренд/навигация и все направления рыбалки сохранены.

## Что принято в техническом scope

| Блок | Фактический результат на 2051567 | Граница |
|---|---|---|
| Чат | два настоящих UI-пользователя; POST201 теряет ответ, сохраняется одна строка; B unread→read→reload=0; чужой watermark запрещён; Realtime сохраняет draft | localhost frontend + настоящий STAGING; physical/multi-device/hosted расширения отдельно |
| Отчёты | три шага, back/next/reload, фото и no-catch, private submit, outsider denial, переход 2→3 не публикует; потеря committed POST201/RPC200 и повтор оставляют один отчёт/один введённый улов | public/private HTTP revoke/GPS/EXIF/Storage — отдельно пройдены реальным core JWT; весь product scope не объявляется принятым |
| STREET | реальный тик >1min, reload, снасти/приманки/улов, opt-in import, смена пользователя в том же браузере без чужой сессии | localStorage не является межустройственной синхронизацией |
| UI | 243 viewport-снимка: 3 движка × 4 ширины × 2 темы × 10 маршрутов; после auth/data/image readiness; no horizontal overflow | owner pixel review/физический телефон/сеть открыты; admin только denial, роли не назначались |

[Точный безопасный итог](../qa/product-contract/ACCEPTED_BROWSER_2051567_SUMMARY.json) · [запуск 41777927568](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41777927568) · [полный архив](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41777927568/artifacts/13298351128). Архив: 32371326 bytes, SHA256 sha256:416987bb6d4bff1597514f4eb0ad134666bdda15bf9a0e17602277db92d32d62; хранится до **11.11.2026 05:20 UTC**.

После завершения CI среда выполнения стала недоступна. Перенос полного архива и просмотр отдельных новых PNG не завершены; не выдавать их за проведённое pixel review. Оригинальные 243 снимка остаются в Actions. [Реальный hosted Atlas до](../qa/product-contract/atlas-blue-before-820.jpg) / [после контраста](../qa/product-contract/atlas-blue-after-820.jpg), [Matte Black](../qa/product-contract/atlas-real-empty-20261104.jpg); эти guest/desktop снимки ранее просмотрены и сохранены в Git. Контраст 12px подписи после reload: oklch(0.552…) → oklch(0.871…), отдельное измерение, не общий WCAG audit.

## CI и настоящий JWT

**13/13 ordinary workflows PASS** на 2051567: [quality](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41777933412), **430 tests / 35 files**, TypeScript, ESLint 0 ошибок/6 прежних warnings, build/generated routes; Docker, Node, PostgreSQL/Deno/races/privacy/isolation/mobile/three-engine appearance.

**Protected workflow overall FAIL**, причина: пять сохранённых QA feedback rows нарушают предусловие пустой истории. Это не скрыто зелёным Browser шагом. На том же SHA core API/media/Realtime и SPOT-negative steps **PASS**, Browser **PASS**, cleanup=true. Предыдущий [d41 run](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41772065215) реально подтвердил feedback: 6 concurrent requests → 5 saved + 1 HTTP429, history/privacy/direct-write denial. При повторах новых feedback rows не создавалось.

Product contract: все 56 исходных ID, поля/статусы, JSON↔Markdown, ссылки и реальные source paths. Сокращённые имена заменены уникальными полными путями; CSS/workflow/Markdown тоже проверяются. **7/7 mutation regressions PASS локально до потери среды**; последний docs HEAD проверяется отдельным Actions. Workflow остаётся в draft #111 до отдельного принятия; main protection не изменён и автоматического release GO нет.

## Hosted Preview и ограничения

Настоящий Netlify E2E f8fdb54/82082ae перенаправлялся на Netlify edge-access до формы ZAPRUDA. [Зафиксированный результат](../qa/product-contract/HOSTED_F8_BLOCKED_41774829766.json). Пароли туда не вводились; cookies/секреты не копировались, защиту не отключали. Hosted gate — **BLOCKED_NETLIFY_AUTH**, localhost PASS его не заменяет. Новых hosted попыток нет.

Предыдущий 5c9ce64 Browser PASS сохранён в Actions; часть его full-page кадров содержала loading/fixed-background артефакты. Это не окончательная визуальная приёмка. ff2cda5 исправил ожидание готовности/viewport; затем 2051567 устранил реальную начальную гонку чата и прошёл повторно. Superseded 397 run отменён на установке движков после core cleanup, до UI writes.

## STAGING и реальные зависимости

Свежий readback: **50 public tables / 50 RLS**, Atlas waterbodies=0, independent moderators=0, approved public SPOT=0, internal verified-catch store=0. Данные/роли/титулы не выдумывались.

Только новые deltas этой приёмки: **20261104041357 v076_atlas_catalog** (4 catalog/claim tables + security_invoker progress view; published-only catalog, own sanitized evidence, запрет self-verified) и **20261104043020 v075_chat_client_message_identity** (authenticated INSERT(id), без broad table INSERT/anon/UPDATE(id)). Предыдущие migrations не переиграны, #105 целиком не применялся, production не менялся. Настоящий JWT читает каталог и собственную invoker view; реальный reviewed каталог/full progress moderation ещё не приняты.

Отсутствуют четыре таблицы: ai_memberships, guide_booking_inquiries, guide_verification_applications, spearfishing_profiles. Отсутствуют шесть RPC: accept_guide_quote, admin_finance_summary, cancel_guide_booking, confirm_club_creation_payment, quote_guide_booking, review_guide_application. Их функции сохранены в 56-ID матрице.

Свежий Yandex diagnose: **YANDEX_KEY_MISSING**, diagnostic_only=true, Web Search OFF. Upstream primary/backup/cache/quota/cutover не приняты; ключи не копировались, квоты не сбрасывались. Confirmed-account login/logout не заменяет signup/confirm/recovery/OAuth/unconfirmed acceptance.

Существующие security notices сохранены: 11 RLS-no-policy INFO, 13 authenticated SECURITY DEFINER WARN, 1 WARN leaked-password protection disabled. Отдельные actor/owner/role guards проверены отрицательными JWT-сценариями, это не глобальная автоматическая приёмка. [SECURITY DEFINER review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [Auth protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Почему main обновлять нельзя

Read-only main: **0d787d8e615dde821ca326fec1eeb6b9ef4ac15d**, предок кандидата. Полный diff: **432 коммита, 321 файл**; merge-tree без конфликтов, дерево **8739c38bbb4ae0cd3f8279b34c052b04aa4c8e04**. GitHub compare выдаёт максимум 300 файлов; полный count получен локально до потери среды.

Production read-only: отсутствуют chat_read_state и RPC mark_chat_read, chat_room_read_summary, publish_report_with_catches; migration history до 20261101204210. Latitude/longitude column grants anon/authenticated сохраняются. Grants сами по себе не доказывают утечку через RLS, но schema/ACL/legacy-media convergence — **P0 gate**.

**KING BLOCKED:** нет разрешённого независимого модератора, approved real SPOT и verified evidence. Policy/race/negative JWT tests не заменяют submit→verify→winner→history→revoke→notify. Никаких fake KING/модераторов/спотов.

До отдельного rollout нужны exact-SHA freeze и owner scope/visual GO, production/STAGING comparison по каждой additive migration/RLS/RPC/Storage/Edge/env, dry-run, проверенный backup/restore и сохранённый предыдущий deploy. При frontend регрессии — возврат сохранённого build с additive DB compatibility. Не применять DROP/CASCADE или слепой обратный replay. Privacy-инцидент — остановка затронутой функции и согласованный forward permissions fix; restore данных только по отдельному решению.

## QA cleanup и решение

Проверены пять точных feedback QA rows по marker/времени, один владелец, 0 incoming FK. Старый private no-catch report от прежнего submit bug проверен по UUID/владельцу/заголовку/времени; фото/уловов/комментариев/реакций/private locations/receipts нет. После явного разрешения владельца эти шесть записей **удалены 04.11.2026** одной атомарной транзакцией с проверкой UUID, marker/содержимого/времени, приватности и владельца отчёта; при наличии зависимостей транзакция прерывалась бы. Обратный SELECT **2026-11-04 11:36:15.622222 UTC** подтвердил: approved_feedback_remaining=0, feedback_marker_remaining=0, approved_report_remaining=0. Удалены только feedback UUID 92289bb1-967f-427a-9773-81308ce3f53f, 91f443d1-c0d0-4b88-8057-902fcb7f1b11, cdc111e7-e77a-4ef5-971b-a652ac3fcbf9, d02badd9-4a9e-4cd2-bd29-694a04ded3ce, 391514f4-3896-42eb-9bd1-50f9c1c9403b (marker QA-FEEDBACK-06e85d9e-797a-4c1e-91a1-ff2cd758d8ee) и private report UUID 22a848f4-eefb-4a28-b5b1-5aceea2a1782. Это устранение старого cleanup blocker; protected workflow после очистки ещё не перезапускался и его исторический FAIL не переименован в PASS. Новые core/browser fixtures удалены own JWT по run prefix; cleanup=true.

Незакрыты full KING, production schema/privacy, hosted/physical mobile, owner scope/visual approval, Auth/AI/guide/admin зависимости и повтор protected job после подтверждённой очистки. Все 56 требований остаются в GitHub. Main/production/DNS/payments/роли/package version/tag/история не изменены. **Это проверенный технический кандидат с NO-GO, а не разрешённый выпуск.**
