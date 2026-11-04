# ZAPRUDA COMMUNITY — БОЛЬШОЙ АУДИТ 0.7.6 KING FINISH
**Дата проверки:** 04.11.2026 (Москва) · **Статус:** технический и продуктовый аудит, `DRAFT / NO-GO` · **Назначение:** сохраняемый baseline для Work и решения владельца перед следующим обновлением.

> **ВАЖНО:** текущая версия исходников — 0.7.5 SPOT. **0.7.6 KING FINISH — утверждённое целевое имя следующего обновления, но релиз не выпущен.** Данный документ не выдаёт код за завершённую приёмку, не разрешает merge/tag/bump/prod и не заменяет 56-ID машиночитаемую матрицу.

## 1. Контрольные точки и способ проверки

| Источник | Проверенное состояние на момент аудита |
|---|---|
| [PR #93](https://github.com/SergeyGalkin91/zapruda1/pull/93) | `feat/ai-yandex-deepseek-staging` → `release/v0.7.5-spot`; Draft, открытый, mergeable=true; **HEAD `8b54b536e05371eca5c6733d239d58f7777bfcfa`** |
| [PR #111](https://github.com/SergeyGalkin91/zapruda1/pull/111) | `docs/zapruda-canonical-decisions-20261104` → `feat/ai-yandex-deepseek-staging`; Draft, открытый, **mergeable=false** до данного документа; HEAD до записи — `4b642682fd93c2b761cf47a319ec5a4978a71fc4`. Нужно повторить проверку после новых изменений. |
| `main` | GitHub сравнение `main...feat/ai-yandex-deepseek-staging`: **ahead 420, behind 0**; API вернул только первые **300 файлов**, не точный общий объём. |
| `release/v0.7.5-spot` | Сравнение с рабочей веткой: **ahead 40, behind 0**, 90 файлов на момент запроса. |
| Последняя полная ранее подтверждённая JWT-проверка | [41768491411](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41768491411): completed/success, SHA `3fbaa2c4ab4e8803fa3d3bfa6a8e1219d62bdefd`. Это **не** HEAD `8b54b53`. |
| Product-contract CI | [41768599499](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41768599499): completed/success, SHA `3df7fb1`, то есть не подтверждение нового HEAD документов. |
| Последний [GitHub Actions check](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41771327546) на HEAD `8b54b53` | **FAIL**: TypeScript TS2769 в `src/components/GeographicChat.test.tsx:161:69`. Lint, build и tests в этом job **skipped** после ошибки. |
| Protected JWT на HEAD `8b54b53` | [41771322203](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41771322203) — **waiting** на момент проверки, не PASS. |
| Cross-browser на HEAD `8b54b53` | [41771327549](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41771327549) — **in_progress** на момент проверки. |
| Остальные checks `8b54b53` | В выборке 14 запусков: frontend build, Netlify isolation guard, SQL race, report-photo privacy и ряд других завершены success. Частичный успех не отменяет красный общий CI. |

**Источник фактов:** read-only GitHub PR metadata, compare endpoint, список workflow runs, steps и логи неуспешного job; тексты [матрицы](ZAPRUDA_FEATURE_MATRIX.md), [JSON](ZAPRUDA_FEATURES.json), [требований](ZAPRUDA_CURRENT_PRODUCT_SPEC.md), [визуальной приёмки](ZAPRUDA_UI_ACCEPTANCE.md), [гейтов](ZAPRUDA_RELEASE_GATES.md), [журнала решений](ZAPRUDA_DECISION_LOG.md), [предыдущего QA](../qa/product-contract/ACCEPTANCE_20261104.md). **Новые физические браузерные, SQL или JWT тесты в рамках этого аудита не запускались.**

## 2. Итоговое решение

**NO-GO для 0.7.6 KING FINISH и NO-GO для main/production.**

Сильные стороны: осмысленная единая архитектура, зафиксированный список функций, реальные исправления UX чата/отчётов/STREET, подтверждённый JWT/API на прошлом SHA, существенная работа над privacy/закрытыми evidence и RLS, много независимых проверок CI. Слабые стороны: последний HEAD не зелёный; несколько полных end-to-end потоков не приняты; система KING имеет код правил, но не предъявлена цепочка настоящего присвоения/отзыва; Atlas и AI зависят от окружения/схемы; Netlify mobile signed-in и визуальное одобрение владельца отсутствуют.

**Нельзя оценивать процент готовности как доказанный:** статус IMPLEMENTED в матрице означает наличие узкой реализации, а не production-/end-to-end-ready. Численная оценка «готово на 75%» не подкреплена измеренным объёмом невыполненных требований.

## 3. Реестр 56 требований — машинный срез

Прочитан `docs/ZAPRUDA_FEATURES.json` в PR #111: **ровно 56 уникальных ID** (источник `source_sha` задаёт доказательную базу предыдущего HEAD, а не текущий SHA). Распределение:
- **29 IMPLEMENTED** — программный контракт найден, live не гарантирован.
- **6 STAGING VERIFIED** — только ограниченный сценарий, ранее подтверждённый на `3fbaa2c`.
- **12 BLOCKED** — реальные или документально установленные зависимости.
- **9 PLANNED** — требуемая реализация пока отсутствует или не доказана.
- **0 E2E VERIFIED** как статус в JSON: ни одну из 56 функций нельзя объявить полным E2E только по статусу реестра.

| Модуль | Всего | IMPLEMENTED | STAGING VERIFIED | BLOCKED | PLANNED |
|---|---:|---:|---:|---:|---:|
| COMMUNITY | 20 | 11 | 6 | 2 | 1 |
| Общая платформа (включая AUTH/UI/RELEASE/ADMIN) | 12 | 5 | 0 | 5 | 2 |
| ZAPRUDA STREET | 4 | 4 | 0 | 0 | 0 |
| FISHING MAP | 2 | 1 | 0 | 1 | 0 |
| ZARUBA | 4 | 2 | 0 | 0 | 2 |
| TROPHY SYSTEM | 9 | 4 | 0 | 2 | 3 |
| AI FISHING | 4 | 2 | 0 | 2 | 0 |
| SPOT MARKET | 1 | 0 | 0 | 0 | 1 |
| **ИТОГО** | **56** | **29** | **6** | **12** | **9** |

Разделение по меткам scope: `P0=19`, `P?=18`, `FULL=11`, `P1=4`, условные `P0 при KING=3`, `P0 при AI=1`. **Scope ближайшего пилота всё ещё не утверждён как конечный список ID.** `FULL` и `P?` не означают удаление фич. Никаких автоматических `DEFERRED`.

## 4. Продуктовая карта: что должно остаться

**ZAPRUDA COMMUNITY для всех рыболовов:** спиннинг, фидер, поплавок, нахлыст, карпфишинг, зимняя, лодочная и прочие дисциплины. Отменить трактовку «только для спиннингистов» как продуктовый scope.

1. **COMMUNITY:** лента с реальными отчётами/фото, реакции и комментарии, тематические и геочаты, личные сообщения, подписки, региональные сообщества, друзья/напарники, клубы, бесплатные СХОДКИ.
2. **FISHING MAP:** водоёмы/виды рыб/Atlas, подтверждённые публичные SPOT и приватные рыболовные отметки с охраной точного GPS.
3. **ZAPRUDA STREET:** личная городская сессия → живой таймер → уловы/снасти/приманки/заметки → завершение → опциональный импорт в отчёт и выбор видимости. Личная запись **не присваивает KING**.
4. **ZARUBA:** батлы на одобренных SPOT/водоёмах, номинации, **BIG FISH одной самой крупной подтверждённой рыбы**, а не совокупной массы.
5. **TROPHY SYSTEM:** независимая модерация реальных доказательств, текущий держатель, leaderboard, история смены/отзыва титула, уведомления по назначению.
6. **SPOT MARKET:** будущие карты, авторы, товары/услуги, платежи и безопасность; **не включать платежный оборот без разрешения**, не удалять из roadmap.
7. **AI FISHING:** план рыбалки с погодой/местом/снастями/тактикой, отдельное AI-улучшение, квоты/кеш/резервная модель; не переключать провайдера без живой primary/backup acceptance.
8. **Платформа:** единый профиль, gear, авторизация email/OAuth, роли, приватность, запрет self-review, административный контур, уведомления.

### 4.1 Семь титулов KING
| Дисциплина | Титул | Основная логика |
|---|---|---|
| STREET | KING OF THE SPOT | масса **одной** подтверждённой рыбы, конкретный проверенный SPOT |
| STREET | LENGTH KING | доказанная длина, SPOT |
| UL/MICROJIG | KING OF UL | масса + проверка правил UL |
| UL/MICROJIG | MICRO KING | длина самой маленькой допустимо подтверждённой рыбы внутри UL; этическая проверка |
| CARP | KING OF THE LAKE | карп/амур, конкретный водоём |
| WINTER | KING OF THE ICE | регион/сезон/метод/вид, без обязательного точного спота |
| BOAT | TROPHY KING | вид/масса, водоём и территориальный уровень |

**Критично:** код политик `src/lib/spot-records.ts` есть, но 3 будущие лиги имеют статус PLANNED; `KING-06/07/08` имеют неполную приёмку. До полной chain `submitted → moderator verified → single winner → history → revoked/recomputed → targeted event` нельзя заявлять KING FINISH готовым. Пороги для фраз «ЛЮТЫЙ СУДАК!» и прочих трофейных слоганов остаются DRAFT, не активировать без решения владельца.

## 5. Функциональная диагностика по блокам

### 5.1 Авторизация, профиль, лента — базовый P0
**Есть:** email/password и confirmed-user gates; profile/gear; отчёты, реакции, приватные медиа. Core JWT/API на предыдущем SHA PASS. **Нужно:** браузерный auth flow signup/confirm/recovery/logout с двумя идентичностями, проверка фото/Privacy, профиль save→readback; повторить feed reload без PGRST200 на новом deployed SHA. Google/Яндекс OAuth BLOCKED, Apple PLANNED, нельзя выдавать кнопку за успешную интеграцию. FK-связь в STAGING описана PR #110, не переигрывать миграцию.

### 5.2 Чат / unread
**Есть после `d421980`, `61b5957` и последующих работ:** UI «Мои чаты», «Непрочитанные», per-user серверные водяные отметки, локальный positive flow посещения пустой комнаты и reload; message/photo/reaction/Realtime API-проверки. **Не закрыто:** авторизованный положительный сценарий `A послал новое → B увидел unread → B прочёл → B после reload видит read → A не может менять B`, а также reconnect/draft/retry в полном browser E2E. Последний commit `8b54b53` как раз правит retry send identity и e2e-скрипт, но Quality CI сломался на TypeScript теста.
**Приоритет:** исправить TS2769, повторить exact-SHA CI и protected JWT; затем положительный реальный двухпользовательский flow, включая RLS и 320/390 keyboard.

### 5.3 Отчёты
**Есть:** 3 шага (Где и когда → Улов и история → Проверка и публикация), preview, per-account draft, private/public, zero-catch, atomic retry, приватные media. В предыдущем Netlify Browser выявлена автоматическая отправка при переходе 2→3, исправлена `90f3f54`, регрессии добавлены. **Нужно:** signed-in 320/390, back/forward/reload всех шагов, invalid focus, photo reattachment, offline/storage errors, publish/retry/no duplicate + авторизованная приватность. Не создавать новые публичные QA отчёты ради теста.

### 5.4 STREET
**Есть:** живой таймер, account-scoped v2 localStorage, снасти/приманки, reload и добровольный импорт в приватный черновик. Cloud Browser ранее прошёл часть flow, но не multi-account isolation + cancellation + failure. **Нужно:** полностью проверить личное/чужое в одном браузере, устаревшие ключи и миграцию v1→v2, завершение сессии после reload, проброс даты, no catch, privacy, отсутствие дубликатов. LocalStorage — не синхронизация между устройствами.

### 5.5 SPOT / ZARUBA / KING
**Есть:** API/Edge и правила номинаций, карты подтверждённых спотов, private evidence, RLS и unit/SQL negative guards. **Не закрыто:** законный approved SPOT, реальные evidence, разрешённый независимый модератор, full JWT approval/rejection/revocation/races/history/notifications, отдельные пользовательские статусные экраны. Не создавать fake SPOT/KING, не поднимать привилегии тестовых аккаунтов и не раскрывать координаты. Если без разрешённой реальной сущности невозможно — документировать blocker и получать решение, а не прятать тест.

### 5.6 Atlas / AI
**Atlas:** `MAP-01` BLOCKED — четыре отношения/представления прогресса отмечены отсутствующими в прошлом snapshot; сделать свежий read-only STAGING inventory и сверить точную schema drift перед миграцией. **AI:** отдельная canary Yandex (DeepSeek V4.1 Flash primary, YandexGPT Pro 5.1 backup) должна доказать настоящий upstream, quota, cache, fallback и ошибки; исторически наблюдался `YANDEX_KEY_MISSING`, проверить статус на HEAD, не считать его автоматически сегодняшним фактом. Daily brief в предыдущем Browser не загрузился. Web Search OFF. Не менять legacy route и secrets без разрешения.

### 5.7 Визуал и пользовательские референсы
**Owner decision:** Matte Black — default, Electric Blue — opt-in; в Electric Blue использовать синие поверхности/электролайм/баклажановый, без зелёных/оливковых cards/gradients и старого сиреневого. Пять вкладок `Лента / Комьюнити / + / Выезды / Чат`. Компактная композиция и бренд, реальные фото, нормальная контрастность, mobile safe area, accessible focus/keyboard, no fake data.
**Существующее доказательство:** гостевой CI на **3fbaa2c** 320/390/768/1440 Chromium/WebKit/Firefox обе темы, no horizontal overflow, persisted theme и scoped computed-color audit; Cloud Browser предыдущего SHA 1363 px показал улучшенную ленту и работоспособность отдельных screen flows. **Не закрыто:** пиксельная сверка с последними вложенными материалами владельца, авторизованная реальная mobile 320/390, все маршруты двух тем с ролями, физическое устройство и российский сетевой сценарий. Референс-картинка не является реальным скриншотом.

## 6. Технические и процессные проблемы документации

1. **Дрейф SHA:** PR #111 рассматривает код `3fbaa2c`, текущий #93 уже `8b54b53`. Обновлять матрицу по diff, не объявлять прежние PASS новыми.
2. **Mergeability:** #111 сейчас mergeable=false на движущуюся feature-ветку; #93 mergeable=true только к `release/v0.7.5-spot`. Требуется безопасная синхронизация документального PR без force-push.
3. **Старые формулировки:** `ZAPRUDA_UI_ACCEPTANCE.md` содержит историческую таблицу «wizard PLANNED / unread disabled / timer gap», хотя нижнее дополнение уже описывает исправления; `ZAPRUDA_RELEASE_GATES.md` в G2/G3 тоже содержит «unread PLANNED / wizard PLANNED». **Исправить исторические пометки или вынести старый baseline в архивный раздел**, не вводя будущего исполнителя в заблуждение.
4. **Исторический design:** старые ссылки и style locks не являются приказом отката. Последние прямые решения владельца и CURRENT_PRODUCT_SPEC/DECISION_LOG имеют приоритет. До одобрения владельцем новый дизайн не объявлять pixel-perfect accepted.
5. **Автоматическая защита 56 ID:** workflow product-contract есть в PR #111 и ранее проходил, но пока не интегрирован с основной веткой и не гарантирован branch protection. Нужен latest-head test, review и merge в release-путь после согласия, без самовольного main.
6. **Процент готовности:** отказаться от неаргументированных процентов; использовать статусы 56 ID + gate evidence, отслеживать долю реально E2E VERIFIED и отдельные обязательные пилотные блокировки.

## 7. STAGING и безопасность

**Неприкосновенно:** production Supabase, main, DNS, деньги, пользовательская история, приватные координаты и оригиналы evidence.

- STAGING проект `yudtbifopfnjtjanaqrd`, production `sonvniuwtvzzyuglscah` (read-only при необходимости и разрешении).
- Исторический readback: 45 public tables с RLS; это срез, не утверждение о свежем состоянии — прочитать STAGING schema заново.
- Отдельная private QA zero-catch запись была создана до исправления wizard auto-submit; статус `is_public=false`; удаление **не разрешено повторно автоматически** после истечения подтверждения. Не использовать force cleanup. Реестр с UUID/владельцем/зависимостями — приватно.
- Не применять повторно предыдущие adopted миграции. Для новых — check applied history, single delta, actor/RLS evidence, rollback, не создавать публичных фикстур.
- JWT тесты должны использовать реальные роли/аутентификацию и отчёт о точном SHA; браузер с гостевой ролью не заменяет signed-in проверку. Secrets/PII не копировать в публичные issues/артефакты.
- Netlify Preview только STAGING. Проверять deployed commit SHA и env isolation, а не доверять названию URL.
- Прямое соединение STAGING проверок и production не разрешено; AI cutover — отдельный go/no-go.

## 8. План закрытия релизных гейтов: по очереди и доказательствам

| Очередь | Что сделать | Артефакт для приёмки | Gate |
|---|---|---|---|
| **P0.0** | Исправить `GeographicChat.test.tsx:161:69` TS2769 на `8b54b53`; повторить TypeScript/lint/build/424+ tests и exact HEAD CI | зелёный quality workflow и SHA | G8 |
| **P0.1** | Перезапустить/завершить protected JWT exact-head и browser signed-in чат с 2 пользователями | positive A→B unread→read→reload, outsider-denied, clean fixtures | G2/G5 |
| **P0.2** | Пройти 3-шаговый отчёт end-to-end и STREET→опциональный приватный отчёт | 320/390, photo, no-catch, retry/no-dup, screenshots | G3/G6 |
| **P0.3** | Провести владельческий UI review всех ключевых экранов и тем, включая authenticated mobile и реальные сравнения | before/after screenshot matrix по точному SHA | G4 |
| **P0.4** | Проверить auth/feed/profile и privacy/Storage/RLS, readback schema | JWT/API, настоящая страница Netlify и отчёт из STAGING | G1/G5/G7 |
| **P0.5** | KING: законный approved spot+proof+authorized independent moderator; полный submit/review/title/revoke/history/notify | E2E или конкретный BLOCKED с владельческим решением | G6 |
| **P1** | Atlas schema/readback, daily brief, AI canary upstream/backup/quota; не cutover | structured evidence и отдельные разрешения | G7/G9 |
| **P1** | Сверить PR #111 с PR #93 и починить противоречащие статусные строки, сохранить все 56 ID | clean mergeable draft #111, contract CI latest head | G0/G8 |
| **Final** | Согласовать scope пилота, коды `P0/P?/FULL`, степень готовности будущих лиг, остаточные риски и план отката | подписанный owner GO на точный commit и 0.7.6 | G10 |

**Отдельное решение о scope:** «KING FINISH» как название не означает обязательное одномоментное включение карпового, зимнего и лодочного титула; но нельзя назвать полным KING-продуктом то, что не прошло его минимальный E2E, или скрыть незавершённые лиги в релизных заметках. Уточнить до заморозки release candidate.

## 9. Перенос в main: оценка и правильный порядок

**Git-история технически совместима по ancestry:** на момент проверки branch `feat/ai-yandex-deepseek-staging` впереди main на 420 коммитов и не позади; это не означает автоматического успешного release. Mergeable #93 относится к другой base-ветке. Для main:
1. заморозить конкретный SHA кандидата, завершить QA и документацию;
2. интегрировать #111 в разрешённую release-цепочку после ревью, проверить проверку 56 ID;
3. убедиться в CI на точном SHA финального дерева; проверить Git diff и конфликты с `main`;
4. отдельно сравнить Supabase production vs STAGING migration history, RLS, Edge Functions, env, OAuth, Storage, Netlify, DNS, legacy/media; **не выполнять prod SQL без отдельного разрешения**;
5. сделать backup/rollback plan, traffic/privacy readiness;
6. подготовить один reviewable PR в main и явный owner GO; затем rollout по отдельному приказу.

Изменения `package.json` с 0.7.5 на **0.7.6 KING FINISH**, tag/release notes — только в будущем release PR, когда gates закрыты.

## 10. Инструкция будущему Work

Перед изменениями читать `CURRENT_PRODUCT_SPEC`, `FEATURES.json`, `FEATURE_MATRIX`, `DECISION_LOG`, `RELEASE_GATES`, `UI_ACCEPTANCE`, затем проверять **живой HEAD #93/#111** и конкретные CI/Env. Сначала устранять подтверждённые blocking failures (на данном срезе TS2769), не переделывать уже реализованные три шага, read receipts или STREET из-за старой таблицы. На каждом отчёте отделять SOURCE FACT / LIVE VERIFIED / PENDING / OWNER DECISION. Никаких новых дублирующих PR, fake moderators, public fish, silent release, удаления миграций, force-push и Render.

## 11. Рекомендуемый формат следующего отчёта владельцу

- **Точный SHA и окружение:** не «последняя версия» без хеша.
- **Что изменено:** commit → files → feature IDs.
- **Принято:** test → role/JWT → target SHA → URL → outcome.
- **Не принято:** blockers с точными причинами, а не «почти готово».
- **Безопасность:** what created/cleaned/preserved; никаких приватных JWT/исходных фотографий.
- **UI:** screenshots Матте Black/Electric Blue на 320/390/768/1440 до/после.
- **Gate G0–G10:** фактические статусы.
- **Решение:** GO/NO-GO, scope, explicit owner permission.

---

### Приложение: прямые ссылки
- [PR #93](https://github.com/SergeyGalkin91/zapruda1/pull/93)
- [PR #111](https://github.com/SergeyGalkin91/zapruda1/pull/111)
- [Красный quality run текущего HEAD](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41771327546)
- [Ранее успешный real JWT run](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41768491411)
- [Ожидавший JWT run нового HEAD](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41771322203)
- [Предыдущая browser QA](../qa/product-contract/ACCEPTANCE_20261104.md)
- [56-ID source of truth](ZAPRUDA_FEATURES.json)

**Безопасный итог аудита:** ничего не слито и не развернуто; этот документ добавляется в draft PR #111 для будущего review.
