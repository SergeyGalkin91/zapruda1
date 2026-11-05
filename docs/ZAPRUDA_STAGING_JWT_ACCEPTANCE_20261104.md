# v0.7.5 SPOT — защищённая STAGING-приёмка, 04.11.2026

Канонический PR #93 → `release/v0.7.5-spot`. Исполняемый кандидат: **827391200b4bbcf9a66a0b6759b132777631834e**. Дизайн v0.6.0-admin-rc.1, обе темы и пять вкладок сохранены. Это приёмка перечисленных STAGING API; публичный запуск приложения остаётся NO-GO.

## DONE — устранён GitHub Environment blocker

В `staging-e2e` было `Selected branches and tags`: разрешались только `fix/issue61-v071-p0-stages-5-8`, `release/v0.7.1-integration-20261102`, `release/v0.7.5-spot`. Добавлена **одна точная ветка** `feat/ai-yandex-deepseek-staging`, без wildcard/tag rules. GitHub показал успешное сохранение и 4 branches / 0 tags. Required reviewer SergeyGalkin91 сохранён, admin bypass выключен; Prevent self-review и Wait timer сохранены в прежнем состоянии. Секреты не переносились и не раскрывались.

После этого run 41750476167 attempt 3 дошёл до runner. Его первый FAIL — ошибочное ожидание только 401: сервер вернул пустой 404, изображение не выдал. Это подтверждено function_edge_logs. Проверка допускает только 401/403/404 и дополнительно исключает image response/JPEG bytes.

## Исправления после настоящего воспроизведения

| Коммит    | Дефект и результат                                                                                                                                                                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abe95b4` | Принят клиентский fix #101: собственный `bio` через `my_profile_full`, legacy fallback только при отсутствии RPC. Шесть component-регрессий не допускают fallback при auth/network error. Добавлены настоящие feedback и дополнительные JWT/Realtime/foreign mutation проверки.                           |
| `cc44a18` | Run 41758247040 доказал 6/6 конкурентных сохранений feedback v1 и ошибку истории 42501. Подготовлены атомарный service-only invoker RPC, собственное чтение user_id, STAGING-only broker v2, SQL/rollback/independent-connection tests. Production entrypoint не менялся.                                 |
| `8273912` | Cold-start logs и установленный Realtime SDK выявили разрыв между channel join и PostgreSQL readiness. Используется поддерживаемый `postgres_changes_options.wait`; чат обновляет историю при ready/rejoin без потери черновика. Live тест требует настоящих INSERT/UPDATE, не подменяет их REST polling. |

Readiness semantics: [Supabase troubleshooting](https://supabase.com/kb/troubleshooting/realtime-postgres-changes-troubleshooting), [Realtime client source](https://github.com/supabase/supabase-js/blob/master/packages/core/realtime-js/src/RealtimeChannel.ts). Документация и установленный SDK проверены, зависимость не обновлялась.

Последующее независимое изменение `652779c` сохранено: `netlify.toml` явно закрепляет только deploy-preview context за STAGING и публичным publishable key. Проверен TOML/target/key class; это не доказательство существования нового Netlify deploy, его runtime env или готовности hosted UI.

## Настоящий JWT/API PASS

[Run 41759969230](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41759969230), job 126345081662, source `8273912`: **все три исполняемых шага PASS**. Четыре существующих разных подтверждённых пользователя авторизованы настоящим Supabase Auth; service key в workflow не использовался.

| Проверка                 | Фактический результат                                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Отчёт/улов/повтор        | Private report+catch: два конкурентных retry, один catch; ошибка улова откатывает report. Чужой report/catch не читается; edit/delete не срабатывают.                                                                 |
| GPS                      | Прямой SELECT точных report coordinates запрещён. Private marks видны только владельцу; guest denied. Приватные значения не выводились.                                                                               |
| Фото отчёта              | Upload/retry, удаление EXIF marker, guest/stranger public read; после public→private оба получают 404, владелец 200; direct Storage signing denied. Public fixture — явно технический отчёт **без рыбы/улова/спота**. |
| Геочат/фото/реакции      | Настоящие send/reaction/photo retry. Получены INSERT ready=false и UPDATE ready=true. Guest photo: пустой 404; чужой DELETE запрещён. Signed-in общий чат допускает чтение участником по своему контракту.            |
| Общий чат/Realtime       | Настоящий INSERT доставлен второму JWT через Realtime. Чужой edit/delete, guest write и запись в чужую страну отклонены.                                                                                              |
| Профиль/снасти/комплекты | Own RPC, чужая приватная снасть недоступна и не изменяется; конкурентный primary selection оставляет один комплект. Существующий выбор/предпочтения сохраняются.                                                      |
| Выезды                   | REST-контракт семи matching-полей прочитан; публичный выезд ради теста не создавался. Это не полный booking E2E.                                                                                                      |
| Погода                   | Независимый настоящий OpenWeather response с числовой температурой; AI quota не расходуется.                                                                                                                          |
| SPOT                     | 4-user authorization preflight, чужая очередь/review/private evidence закрыты, multipart upload для неразрешённого spot отвергнут, catch не сохранён. **Не live KING.**                                               |

## Обратная связь v2 и восьмая дельта

Только STAGING: `20261104021404 v075_feedback_atomic_limits`, файл `supabase/staging/v075_feedback_atomic_limits.sql`. Семь прежних/adopted миграций не повторялись. `community_requests` не пересоздавалась, RLS и owner policy сохранены. Добавлено SELECT(user_id) для существующего фильтра истории; body/contact и прямой INSERT/UPDATE/DELETE закрыты. `submit_community_request_v075` — **SECURITY INVOKER**, fixed empty search_path, EXECUTE только service_role. Transaction advisory lock сериализует check+insert: 5/час и 15/rolling 24h.

`submit-community-request` **v2 ACTIVE / verify_jwt=true** развёрнута после PostgreSQL17/Deno PASS; source readback точно совпал. Код изолирован в `supabase/staging/functions/`; исходный production entrypoint не изменён. В новом broker есть точный STAGING URL guard, проверка настоящего подтверждённого неанонимного Auth user, 400 для JSON null. Исходящего Telegram-кода нет.

Настоящий JWT PASS в 41759969230: guest denied, invalid body/null denied, серверное сохранение, own history включая точный UI query, stranger не читает, private columns/client INSERT/server-only RPC закрыты. **6 параллельных POST → 5 × 201 + 1 × 429**; telegram_delivered=false. 15/24h boundary проверена **в изолированной SQL БД**, не выдаётся за hosted JWT PASS.

Очистка: core script cleanup=true; отдельно через подключение STAGING удалены ровно 5 возвращённых UUID с точным QA marker/body/time guards. До этого удалены ровно 6 UUID из воспроизведения v1. Реальные обращения не затронуты. Итог 02:23 UTC: 45 public tables, 0 без RLS, 0 public reports/catches/messages/chat photos/feedback/QA Storage objects; прежний один private report сохранён.

## Разделение доказательств и оставшиеся gates

- **Offline:** 421 Vitest / 33 файла, включая 29 SQL и 4 chat/6 profile component cases. PostgreSQL17 — 5 серий 6 конкурентных запросов (ровно 5 saves), 15/24h и rollback/reapply с сохранением записей. Это не JWT.
- **Browser CI:** guest/mobile/visual, 320/390/768/1440, обе темы/три движка; результат на точном текущем SHA читать в [PR #93 Checks](https://github.com/SergeyGalkin91/zapruda1/pull/93/checks). Это не авторизованный hosted Netlify browser E2E.
- **Unconfirmed Auth:** четыре защищённых account secrets относятся к confirmed users. Живой unconfirmed-account сценарий не исполнялся; SQL/серверный guard не объявляется его заменой. Статус подтверждения существующих аккаунтов не менялся ради теста.
- **KING:** нет разрешённого независимого модератора, законного approved spot и подлинного evidence; роли/точки/публичные уловы не создавались.
- **Atlas/прочее:** #105 просмотрен отдельно, не применён. В драфте нет my_atlas_progress, а контракт trusted/sanitized evidence и confirmed actor требует собственных тестов. Остались 8 таблиц + Atlas view + 6 клиентских RPC/guide paid differences, см. matrix. Данные/права production не копировались.

## Netlify: факты и доступ

Site ID **3a98edc7-c77f-45f8-9fe0-7a156c72abf5** подтверждён реальным Netlify Team protection redirect. Из GitHub bot/status подтверждён старый [PR #54 preview](https://deploy-preview-54--zapruda1.netlify.app), deploy `6ae8ba90eaff6cd3d1f0f371`, source **e1288d404db9912a11190cd1ad0e752300f660c1**. Preview фактически открывается только до страницы **This site is private**. Это не v0.7.5-кандидат и не доказательство последнего опубликованного SHA.

Dashboard для существующего deploy требует входа. Автоматическая проверка отклонила OAuth предоставление Netlify Auth read-only GitHub email scope: нужно отдельное явное согласие на этого получателя/данные. Не обходить отказ, не отключать Team protection и не создавать новый site. Production branch/current published SHA/build env/bundle secrets/hosted login ещё **BLOCKED**. Репозиторная preview-isolation проверка не заменяет это доказательство.

## Yandex и приоритеты

Run [41736781269](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41736781269) attempt 3 после branch fix реально исполнился: OpenWeather PASS, обе read-only diagnostics вернули **YANDEX_KEY_MISSING**, quota не изменилась. В canary отсутствует доступное значение `YANDEX_AI_API_KEY`; дальнейшие folder/IAM/model/endpoint/balance gates не достигнуты. Нельзя называть это отказом upstream или требовать ротации xAI. `YANDEX_AI_FOLDER_ID` и approved models проверяются после появления конфигурации. Web Search OFF; canary v2 отдельно, original legacy v14 и XAI secrets сохранены.

**P0:** public launch/production privacy drift остаётся закрытым gate; без отдельного backup/media/schema плана и разрешения production не менять. **P1:** Netlify full current-deploy/UI acceptance, настоящие primary/backup AI, missing Atlas/guide surfaces, unconfirmed/live KING gates. **P2:** прежние 6 lint warnings, Supabase advisories, Node action deprecation; они не являются причинами разобранного branch/JWT failure.

Production read-only migration inventory: 62, latest 20261101204210. Main SHA при аудите 0d787d8; release base 3a43ed6. Существующий чужой PR #108 из work mirror в main не объединялся, auto_merge=null; новый PR не создан. #109 README остаётся отдельным открытым docs PR. Никакого public release, DNS, реального платежа или production изменения эта приёмка не выполняет.
