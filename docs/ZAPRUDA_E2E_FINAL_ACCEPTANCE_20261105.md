# P0 — финальный защищённый E2E, 05.11.2026 (Москва)

**DONE: исправлено падение браузерной матрицы; полный защищённый прогон прошёл на точном #93 SHA `37eb39aa92e55607e58234f264da0470c973fe10`. Релиз 0.7.6 KING FINISH ON SPOT+ остаётся NO-GO.** Техническая версия0.7.5, все56 исходных ID,8 модулей,7 KING и обязательные OSP-01…09 сохранены.

## Исправление и воспроизведение

В [41941541992, attempt2](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941541992) на `8777e4ffbe43211ffcb04dba968dcfe28a149bcd` шаг `Real authenticated browser journeys and screenshots` завершился ошибкой strict-mode: глобальный `getByRole('button', {name:/^Matte Black/})` находил две разные настройки — цветовую тему и независимые обои. Матрица упала до первого route-скриншота. Начальный curl connection-refused был ожиданием запуска сервера, не первопричиной.

Коммит [37eb39a](https://github.com/SergeyGalkin91/zapruda1/commit/37eb39aa92e55607e58234f264da0470c973fe10) вводит общий semantic locator внутри `section[aria-labelledby="app-background-title"]`. Тест проверяет единственность кнопки, завершение hydration, `aria-pressed`, фактическую тему и неизменность отдельно выбранных обоев. Гостевые проверки используют тот же locator вместо `.first()`. Регрессия настоящего Settings оставляет обе одноимённые кнопки. При ошибке матрица записывает engine/width/theme/route. Проверки, маршруты, движки, ширины, темы, RLS и cleanup не отключены.

Санитизированные результаты: [8777 failure](../qa/e2e-p0-20261105/8777-attempt2-failure.json), [37eb acceptance](../qa/e2e-p0-20261105/37eb-acceptance.json). Полные авторизованные снимки находятся в GitHub artifact; их не копировали в публичные документы.

## Фактические результаты на 37eb39a

| Проверка | Результат и доказательство |
|---|---|
| Полный защищённый E2E | **PASS**, [41957327094](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957327094), оба job SUCCESS, включая browser step |
| Реальные JWT/API | Четыре разных подтверждённых аккаунта; own progress/inbox, hostile Origin, guest/foreign argument, unauthorized review/evidence и signed multipart upload в неразрешённый SPOT — PASS; отклонённый улов не сохранён |
| Настоящий авторизованный UI | Два реальных password login; приватный report/catch/photo, ответ после успешного сохранения потерян → идемпотентный повтор, wizard/no-catch/draft/back/next, foreign denial — PASS |
| Чат и STREET | UI send retry создаёт одно сообщение; реальный Realtime/unread/open/read/reload, запрет чужой отметки, сохранение черновика; STREET >1мин/reload/снасти/импорт/смена аккаунта — PASS |
| Авторизованная матрица | Chromium/Firefox/WebKit ×320/390/768/1440 ×2 темы ×12 маршрутов =288 route PNG, плюс4 сценарных =**292 PNG**; bounds/44px controls PASS. Это viewport/localhost frontend + настоящий STAGING, не физический телефон и не hosted Netlify acceptance |
| Очистка | `cleanup:true` в browser result. Только собственные изолированные QA записи; negative upload не создал SPOT catch. Роли/публичные споты/публичные фиктивные уловы не создавались |
| Обычный CI |13/13 SUCCESS, таблица ниже; TypeScript, lint0errors/6 baseline warnings,484 Vitest/42файла, build, Docker, Deno, schema/route guards |

Artifact `architecture-real-JWT-safe-result`, ID **13384367803**, SHA256 **b427400b822668382cc1b8fdc9e5292bb897fe5898edbdf441d10ffa0ea7ef4a**, привязан к source SHA37eb39a. Срок хранения7дней. JSON-доказательство содержит только безопасные результаты, а не JWT, email/пароли, координаты или оригиналы фотографий.

| Обычный workflow | PASS |
|---|---|
| ZAPRUDA checks | [41957334205](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334205) |
| Frontend Build | [41957334298](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334298) |
| Docker smoke | [41957334206](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334206) |
| Electric Blue cross-browser | [41957334183](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334183) |
| Netlify STAGING isolation guard | [41957334313](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334313) |
| Pilot schema PostgreSQL/Deno | [41957334291](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334291) |
| SPOT PostgreSQL races | [41957334140](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334140) |
| Report photo privacy browser | [41957334322](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334322) |
| Independent Node hosting | [41957334204](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334204) |
| Advisor without provider | [41957334320](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334320) |
| Yandex Deno | [41957334223](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334223) |
| Meetup guards | [41957334227](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334227) |
| Meetup mobile | [41957334236](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957334236) |

## Реальная цепочка отчёт → BIG FISH → KING

| Этап | Статус |
|---|---|
| Создание собственного приватного отчёта с одним уловом и обработанным фото | **DONE / настоящий UI+JWT PASS** |
| Явный выбор одной рыбы → BIG FISH → reload; отсутствие автоматической заявки; изоляция чужого аккаунта | **DONE / настоящий UI+JWT PASS** |
| Собственный серверный progress и профиль с честным отсутствием заявок/титулов | **DONE / настоящий UI+JWT PASS** |
| Принятая законная заявка и её реальный pending/verified статус | **BLOCKED**:0 approved+reviewed SPOT, нет подлинного разрешённого evidence |
| Независимая модерация → реальная выдача/отзыв KING → титул в профиле | **BLOCKED**:0 разрешённых независимых модераторов и нет настоящего проверяемого улова. Никаких назначений/фиктивных заявок для теста |

Проверка UI пустого профиля и SQL-симуляция подтверждённого титула не объявляются положительным KING E2E.

## Netlify и мобильный Preview

Подтверждён GitHub status для точного37eb39a: `netlify/zapruda1/deploy-preview = success`, `Deploy Preview ready!`, target **https://deploy-preview-93--zapruda1.netlify.app**. Изоляция STAGING в сборке/обычном CI PASS; реальный API прогон принудительно использует `yudtbifopfnjtjanaqrd`.

**PARTIAL / hosted verification BLOCKED:** проверочный браузер перенаправлен Netlify Team protection на вход. Google принял защищённые identifier/password и ожидает device approval. Не отключались protection/reviewers, не копировались credentials/cookies в код. Доступ к самой новой странице, отображаемый deployed COMMIT_REF, hosted bundle/runtime env и mobile layout на этом URL пока не подтверждены. GitHub deploy status не подменяет это доказательство. Физический телефон/клавиатура/мобильная сеть также не проверены.

## ON SPOT+ — отдельная реализация, не часть PASS37eb39a

[PR114](https://github.com/SergeyGalkin91/zapruda1/pull/114), ветка `work/v076-on-spot-plus-stage1-20261105`, HEAD **f8eae65e7dd2b8572ece1d475ef43afe7c69a897**, base37eb39a. [Дизайн и границы](ZAPRUDA_ON_SPOT_STAGE1_DESIGN_20261105.md) подготовлены до SQL/API изменений; [утверждённый OSP-01…09](ZAPRUDA_ON_SPOT_PLUS_RELEASE_CONTRACT_20261105.md) остаётся полностью обязательным.

Реализован первый срез: coarse catalog без GPS/people/presence, explicit join/leave, idempotency/limit10, подтверждённый actor JWT каждой RPC, поздние ответы после смены аккаунта отбрасываются. Зона привязана к действительно approved+reviewed SPOT. Приватная схема хранит membership/bans без browser grants; restrictive RLS закрывает существующие сообщения/фото/реакции/read-state после выхода, блокировки, закрытия/отзыва SPOT, включая orphaned rooms. Отдельные zone-chat engines/Storage не создавались. Явный недоступный chat ID больше не открывает глобальный чат.

Новая дельта **20261105025733_v076_on_spot_zone_membership.sql** и rollback находятся **только в `supabase/staging`**; **НЕ ПРИМЕНЕНЫ** к hosted БД. Проверено совпадение actual prerequisite columns/constraints и отсутствие OSP schema/RPC в STAGING. Конкретный reviewed source SPOT не создан, public fixtures отсутствуют. Текущий защищённый37eb прогон прошёл на неизменённой схеме. Применение дельты и последующая настоящая JWT/Realtime приёмка — отдельный следующий шаг после ревью этого среза; это не требование нового разрешения на обычную STAGING разработку.

Локально на exact tree **5d3517f5aa0bcfbce0e34aa957e48d85e17d0a43**: **520 Vitest/45файлов**, TypeScript, lint0errors/6baseline warnings, build,28routes/6core edges и migration version audit PASS. Включены19 isolated SQL/rollback,10 component,6 API actor-binding и fail-closed chat регрессия. SQL-фикстуры не были отправлены в STAGING и не являются JWT E2E.

OSP-01/02 **PARTIAL / NOT ACCEPTED**, OSP-03 только reuse/access foundation; полноценный report/block/moderation UX **OPEN**. OSP-04…09 (presence/TTL, discoverability anti-abuse, mutual invites, opt-in inbox/broadcast, joint trip/photo consent, retention/security/full hosted QA) **NOT STARTED / mandatory P0**. Эти этапы не скрыты и не перенесены из0.7.6.

## Оставшиеся действия и приоритеты

- **P0 BLOCKED — genuine KING:** владелец должен определить разрешённого независимого модератора, законный reviewed SPOT и подлинный улов/evidence. Самостоятельного назначения/публикации не будет.
- **P0 BLOCKED — hosted Preview:** завершить отправленный Google device approval; затем проверить новый COMMIT_REF, STAGING runtime и мобильные страницы. Не требуется новый Chrome или изменение пользовательского Firefox.
- **P0 PARTIAL — ON SPOT+:** ревью PR114 → точечное STAGING применение → настоящие membership/Realtime E2E на законной зоне; далее обязательные OSP-04…09. Защищённый branch review для новой ветки проверять до запуска, не повторять заведомо запрещённые workflow.
- **P0 OPEN — ранее установленные full-product gates:** guide/непроверенные schema dependencies, production privacy/migration/restore readiness и окончательная приёмка из RELEASE_GATES не закрываются этим тестом.
- **P1 BLOCKED — Yandex:** текущая read-only diagnose возвращает `YANDEX_KEY_MISSING`, Web Search=false, квота не затронута. Настоящий upstream/model/storage/cache ещё не подтверждён; original AI/cutover/legacy XAI не изменены.

Main, Production, DNS, платежи, version/tag и опубликованный релиз не изменены. Никакого merge PR93/114 в release/main не выполнено. Проверенный P0 E2E не равен готовности полного продукта к релизу.
