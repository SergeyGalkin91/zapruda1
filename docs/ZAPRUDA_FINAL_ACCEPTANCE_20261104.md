# ZAPRUDA — результат технической приёмки 04.11.2026

**NO-GO для main/production и выпуска 0.7.6 KING FINISH.** Техническая версия остаётся 0.7.5 SPOT. Это проверяемый кандидат с открытыми блокерами, не утверждённый релиз.

Код PR #93: **`5c9ce64fb5fde4eacbcabf955237d9b72b715559`**. STAGING: `yudtbifopfnjtjanaqrd`. Документальный PR #111 сохраняет все 56 ID и актуальные решения владельца. Ни один PR автоматически не объединяется.

## Что реально исправлено

| Коммит | Изменение |
|---|---|
| 8b54b53 / 03873ac | Один UUID отправки чата при потерянном ответе; PostgreSQL-ready unread summary, refresh после reconnect; исправлена TS2769 регрессия |
| d41f02f | Защищённая пустая Atlas schema, isolated SQL tests; проверка потерянного publish RPC ответа в Browser |
| 22f19cd | Найденное Browser отсутствие INSERT(id) исправлено узким column grant в STAGING; тесты spoof/collision/guest/UPDATE denial |
| f8fdb54 | Select отчёта получает точное доступное имя через aria-labelledby; component regression; запуск настоящего Preview E2E с проверкой SHA |
| 82082ae | Credentials запрещены при изменении origin; Netlify access blocker отражается отдельно; независимый localhost/STAGING E2E продолжается без обхода защиты. Увеличен контраст подписей Atlas |

Ранее реализованные mine/unread, 3 шага, private default, автосохранение, report retry и account-scoped STREET/ticking/tackle/lures/import сохранены. Проект не пересоздавался.

## Приёмка по блокам

| Блок | Доказано | Открыто |
|---|---|---|
| Чат | [6fd2464 / 41774159540](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41774159540): два настоящих UI-входа, POST=201, одна строка при потерянном ответе; B unread→open/read→reload=0; чужой watermark недоступен; Realtime сохраняет draft; cleanup=true | Полный hosted/multi-device/reconnect/физическая клавиатура; результат относится к localhost frontend + настоящему STAGING |
| Отчёт | Три шага и исправление преждевременного submit, приватный default, atomic report/catches retry; настоящий API privacy/EXIF/revoke PASS. NewReport component 10/10 PASS после исправления доступного имени select | Полный положительный Browser publish/catch/no-catch/retry текущего кандидата проверяется, не объявлен PASS заранее |
| STREET | Реализация ticking timer/account storage/tackle/lures/import; прежний Cloud Browser reload→opt-in draft подтверждён в QA | Полный текущий two-account Browser flow проверяется отдельно; localStorage не является межустройственной синхронизацией |
| UI | Реальные before/after сохранены; обе темы в Cloud Browser; 320/390/768/1440 изолированный guest CI. На актуальном Preview выявлена бледная 12px подпись Atlas и исправлена | Owner visual approval, полный authenticated matrix и физический телефон/сеть не приняты |
| Atlas | STAGING schema + RLS/invoker readback; isolated SQL own/foreign proof checks PASS; настоящий JWT 6fd читает три catalog relations и собственную invoker progress view | Каталог пуст, реальные reviewed водоёмы/виды и full progress/moderation E2E отсутствуют; данные не выдуманы |
| KING | Policy/transaction races и настоящий JWT authorization negative scope | **BLOCKED:** 0 разрешённых независимых модераторов, 0 approved public SPOT, 0 verified catches. Нет положительной цепочки submit→verify→winner→history→revoke→notify |

[Безопасный Browser результат 6fd](../qa/product-contract/BROWSER_6FD_41774159540.json), [390px чат после чтения](../qa/product-contract/chat-two-users-390-6fd.png). Старые результаты не переносятся автоматически на изменённый код.

## CI и настоящий JWT

[Quality 5c9ce64](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41775937602) PASS: TypeScript, ESLint, build и unit/component suite. **428 tests / 35 files PASS** на 82082ae. Линтер имеет 6 прежних warnings, 0 ошибок.

[Protected 41775932765](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41775932765) ещё выполняется. **Не считать общий protected workflow зелёным:** повторный feedback заблокирован непустой собственной историей QA. Предыдущий [d41 JWT run](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41772065215) подтвердил core API/media/Realtime, feedback (6 запросов → 5 сохранений + 1 HTTP429, history/privacy), SPOT-negative scope. Его Browser не стартовал из-за неверного import expect; это исправлено. [Безопасный API/JWT evidence](../qa/product-contract/JWT_D41_41772065215.json).

Независимые Browser шаги исполняются даже после feedback failure, чтобы собрать доказательства. **Это сохраняет общий FAIL**, не скрывает ошибку и не даёт release GO. Product contract checker + 6 mutation regressions PASS локально; [GitHub contract 5a46b3c](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41773892395) PASS. Workflow ещё не интегрирован в #93 до принятия #111.

## Настоящий hosted Netlify

[41774829766 / f8fdb54](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41774829766) попытался открыть Preview, но перенаправлен на Netlify `/edge-access` **до формы ZAPRUDA**. [Точный безопасный результат](../qa/product-contract/HOSTED_F8_BLOCKED_41774829766.json). Пароли не передавались Netlify. Cookies/секреты из Cloud Browser не копировались; доступ Preview не ослаблялся. Поэтому hosted signed-in/3-engine gate — **BLOCKED_NETLIFY_AUTH**, не PASS. Повторная 82082ae попытка тоже остановилась до входа: redirect завершился после первичного origin check. 5c9ce64 прекращает новые hosted попытки, ждёт именно кнопку входа ZAPRUDA и выполняет отдельный localhost/STAGING сценарий с явной меткой hosted BLOCKED. Это не обход wall.

Cloud Browser с существующим доступом прочитал реальный пустой Atlas; [Matte Black](../qa/product-contract/atlas-real-empty-20261104.jpg), [Electric Blue до коррекции контраста](../qa/product-contract/atlas-blue-before-820.jpg). [После исправления контраста](../qa/product-contract/atlas-blue-after-820.jpg): Cloud Browser после reload подтвердил цвет 12px подписи oklch(0.552…) → oklch(0.871…), тот же реальный пустой каталог; это отдельное измерение, не общий WCAG audit. Это guest/desktop scope. Старый [before/after evidence](../qa/product-contract/ACCEPTANCE_20261104.md) и его ограничения сохранены.

## STAGING / AI / зависимости

**50 public tables, все 50 RLS.** Новые deltas этой приёмки:

- `20261104041357 v076_atlas_catalog`: четыре пустых catalog/claim таблицы и `my_atlas_progress security_invoker=true`, default is_published=false, published-only catalog; заявка требует собственного улова/отчёта и готового безопасного фото. Нет client catalog write/самоподтверждения.
- `20261104043020 v075_chat_client_message_identity`: authenticated INSERT(id)=true; table INSERT=false, anon INSERT(id)=false, UPDATE(id)=false, RLS=true. Existing confirmed actor/owner/geography policies сохранены.

Предыдущие миграции не переигрывались; #105 целиком не применялся и не объединялся. Production не изменялся.

Остаются отсутствующими таблицы `ai_memberships`, `guide_booking_inquiries`, `guide_verification_applications`, `spearfishing_profiles` и RPC `accept_guide_quote`, `admin_finance_summary`, `cancel_guide_booking`, `confirm_club_creation_payment`, `quote_guide_booking`, `review_guide_application`. Эти функции сохранены в 56-ID матрице.

**Свежий настоящий JWT diagnose Yandex:** `YANDEX_KEY_MISSING`, diagnostic_only=true, Web Search OFF. Нет primary/backup upstream/cache/quota acceptance, cutover/копирования ключей/сброса квот не было. OAuth signup/confirm/recovery и недостающие роли требуют отдельных настоящих сценариев; подтверждённые четыре аккаунта не заменяют unconfirmed case.

## main, production и откат

Read-only main: `0d787d8e615dde821ca326fec1eeb6b9ef4ac15d`, предок кандидата. Полное локальное сравнение: **429 коммитов, 321 файл** (GitHub compare ограничивает выдачу 300 файлами). `merge-tree --write-tree main 5c9ce64` PASS без конфликтов, дерево `4b7f8e9da396aa975bd856beab64898c8f70558b`. Это Git-проверка, не production допуск.

Production read-only: отсутствуют `chat_read_state` и RPC `mark_chat_read`, `chat_room_read_summary`, `publish_report_with_catches`; migration history заканчивается `20261101204210`. На fishing_reports.latitude/longitude сохраняются anon/authenticated column grants. Grants сами по себе не доказывают утечку через RLS, но **ACL/legacy media convergence остаётся P0 gate**. Обновлять main сейчас безопасно нельзя: приложение и production schema не согласованы.

До отдельного будущего rollout:

1. Заморозить exact SHA, принять scope по IDs, завершить gates и review #111. Сохранить текущий deploy artifact и backup schema/data; проверить восстановление в отдельном окружении.
2. Сопоставить production/STAGING migrations, RLS/grants/RPC/Storage/Edge/env без слепого replay STAGING history. Подготовить additive последовательность и dry-run; секреты не помещать в Git.
3. Проверить origin/OAuth callback, publishable-only frontend, Edge JWT и deployed SHA. DNS/платежи/AI cutover — отдельные решения.
4. Только после owner GO выполнить согласованный rollout и canary auth/feed/report/chat/media. Версия/tag/production этим заданием не меняются.
5. При frontend регрессии вернуть сохранённый build/deploy, сохранив additive database compatibility. Не откатывать БД DROP/CASCADE и не удалять пользовательские данные. Для privacy — остановить соответствующую функцию и применить согласованный forward permission fix; data restore только по отдельному решению из проверенного backup.

## QA cleanup и финальные gates

Пять точных feedback QA UUID проверены по marker/времени, один владелец, 0 incoming FK. Одна старая private zero-catch запись от submit bug проверена по UUID/владельцу/заголовку/времени; фото/уловов/комментариев/реакций/private locations/receipts нет. Обе группы сохранены до действующего отдельного подтверждения удаления. Массовой очистки нет. Новые core/browser fixtures удаляются только own JWT по уникальному run prefix; cleanup проверяется в evidence.

Для GO остаются: full KING, production schema/privacy convergence, hosted Netlify authenticated mobile/3-engine acceptance, physical keyboard/network, owner visual/scope approval и зависимости AI/guide/admin/OAuth. Зелёный отдельный check не снимает их. Main/production/DNS/платежи/роли/версия/теги/история не изменены.
