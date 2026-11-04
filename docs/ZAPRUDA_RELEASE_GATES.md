# ZAPRUDA — условия следующего обновления
05.11.2026 (Москва). Контракт DRAFT. Техническая база v0.7.5 SPOT; целевой релиз 0.7.6 KING FINISH. Последний визуальный кандидат: [Premium STAGING acceptance](ZAPRUDA_PREMIUM_UI_ACCEPTANCE_20261105.md). Историческая техническая приёмка: [FINAL_ACCEPTANCE](ZAPRUDA_FINAL_ACCEPTANCE_20261104.md).
**NO-GO. Последние D18/D19 прямо запрещают main и Production в текущей операции. База0.7.5, target0.7.6 KING FINISH; bump/tag/release не разрешены.**
Актуальный срез: [FINAL_RELEASE_INTEGRATION](ZAPRUDA_FINAL_RELEASE_INTEGRATION_20261104.md). Исторические результаты ниже относятся к указанным SHA.

## Состав пилота
P0 из FEATURE_MATRIX — обязательные критерии уже запрошенной приёмки. P? — предлагаемый состав для утверждения, FULL — полный продукт/поздняя очередь без автоматического переноса. Не объявлять весь продукт обязательным к одномоментному выпуску; не исключать незавершённые функции из обязательного плана.
Для принятия состава: владелец утверждает конкретный список feature IDs, принимает остаточные риски и явно решает каждое исключение. До этого никакой DEFERRED/GO.

| Gate | Необходимое доказательство | Сейчас |
|---|---|---|
| G0 требования | все согласованные идеи имеют ID, код/пробел, критерий, владельца решения и scope | DRAFT матрица в этом PR; ревью открыто |
| G1 стабильность | вход/confirm/recovery/выход, feed reload без FK ошибки, профиль save/readback, все P0 переходы | OPEN; FK по PR #110 применена, live открыт |
| G2 chat | два реальных JWT, Realtime/text/photo/reaction/reply, reconnect и unread/read receipts | Scoped actual API + two-user localhost/STAGING Browser41908405475/4eba367 SUCCESS: read/unread/receipts, Realtime/retry/privacy. Full hosted/new-Premium/physical scope OPEN. |
| G3 report | 3 шага, no-catch, draft/reload, privacy, retry без дубля, atomic catches, фото/GPS/EXIF | Actual signed-in three-step catch/no-catch/draft/photo/privacy/atomic retry41908405475/4eba367 SUCCESS. Hosted/new-Premium/physical review OPEN. |
| G4 UI | before/after 320/390/1440, обе темы, последние референсы, контраст/focus/keyboard/no overflow | 9c7fe6e: actual signed-in hosted layout/readiness 5screens×4widths×2themes PASS; eight theme/wallpaper reload combinations PASS. First-tap hydration defect fixed and regressed. Physical phone/keyboard/safe area, complete accessibility and owner pixel acceptance OPEN; guide errors retained. |
| G5 безопасность | guest/owner/outsider/разрешённые роли, RLS/ACL/RPC/Storage, закрытые оригиналы, JWT isolation | Four actual JWTs/API/Storage/Realtime/private boundaries41908405475/4eba367 PASS; scoped evidence retained. Full new-source hosted/role and unresolved advisory/production gates OPEN. |
| G6 STREET/SPOT/KING если в пилоте | сессия → opt-in report; реальный legal SPOT/evidence; независимая модерация, tie/race/revoke/history/notifications | OPEN; нельзя подделывать данные/роли |
| G7 backend/deploy | свежий read-only STAGING inventory, сверка с нужными контрактами, deployed SHA = tested SHA, только STAGING в preview | 9c7fe6e Netlify6aebae0a59ab32e0cc56cdfb matches tested code and onlySTAGING origins. Live club membership correlation/applied deltas read back correctly; guide contract, production-specific migration/restore/env/OAuth gates OPEN. No applied migration repeated. |
| G8 CI | typecheck/lint/tests/build + необходимые SQL/browser checks на exact code SHA, изучить skipped/failed jobs | 9c7fe6e all13 ordinary workflows SUCCESS:450tests/38files,TypeScript/lint/build,PostgreSQL/meetup/SPOT/privacy,three-engine visuals. Historical protected41908405475/4eba367 SUCCESS remains separate; no protected9c7 rerun or blanket release acceptance. |
| G9 AI если включён | актуальная погода, primary/backup, Web Search OFF, quota/cache/failure/privacy live | OPEN; cutover требует отдельного разрешения |
| G10 пилот и версия | owner-approved scope + приёмка + явное разрешение конкретной версии | OPEN; автоматический bump/tag/release запрещён |

## Обязательная запись на каждое обновление
В PR: базовый SHA → кандидат SHA, список всех feature IDs текущего релиза, before/after статусы, ссылки на тесты/скриншоты/live evidence, известные ошибки. Для каждой незавершённой функции: сохраняется обязательство, зависимость, следующий шаг; исключение из релиза — ссылка на решение владельца. Новый green CI не переносит старую E2E-приёмку на другой код автоматически.
Формат evidence: ID → SHA → окружение/project ref → дата → сценарий/роль → ожидаемое/полученное → артефакт → ограничения. Секреты и личные доказательства не публикуются.

## Контроль без ложного обещания автоматизации
В этом PR добавлен GitHub Actions product-contract: проверяет 56 исходных ID по неизменяемому коммиту 1fa7684, дубли, поля/статусы, согласованность JSON/Markdown, source paths и локальные ссылки документов. 7 отрицательных/положительных regression tests. CI не даёт release GO и не меняет branch protection. Пока PR #111 не принят, workflow не присутствует в интеграционной ветке #93. Ручное ревью и решение владельца остаются обязательными.

## Порядок следующей работы
1. Утвердить матрицу и границы пилота; сохранить полный backlog.
2. Исправлять P0 стабильность, затем chat → reports → mobile UX → STREET/SPOT/KING, по контрактам.
3. Выполнить браузерную/JWT STAGING-приёмку и обновить evidence.
4. Запросить финальный GO только для конкретного проверенного кандидата.
Main/production/DNS/реальные платежи/Render не затрагивать. Публичный релиз и AI cutover — отдельные разрешения. Численные trophy thresholds остаются неактивными до согласования.

## Целевая версия по прямому решению владельца 04.11.2026
**Утверждённая целевая версия следующего обновления — `0.7.6 KING FINISH`.** Она заменяет предыдущий целевой номер `0.7.1` и следует после технической базы `v0.7.5 SPOT`. Название версии не означает, что KING уже реализован или прошёл E2E. До выпуска сопоставить актуальные решения с 56 feature IDs, утвердить состав пилота и исключения, выполнить G0–G10, реальную проверку KING в утверждённом scope и получить отдельный owner GO. Этим документальным PR **не выполнять** package version bump, git tag, переименование ветки, merge в main, production deploy или release.

## Итог фактических checks (не release GO)
HEAD 3fbaa2c4ab4e8803fa3d3bfa6a8e1219d62bdefd: 13 ordinary workflows и protected JWT 41768491411 PASS. Contract run 41768599499 PASS на docs 3df7fb1. Это закрывает перечисленные API/CI-проверки, но не все G0–G10: остаются full positive receipts/UI, visual owner review, полный KING, daily brief/Atlas и прочие зависимости. Не bump/tag/merge автоматически.

## Исторический P0 continuation до последнего owner approval (04.11.2026)
Текущий [P0 результат](ZAPRUDA_P0_CLOSURE_20261104.md): security deltas/SQL regressions и 13 ordinary workflows PASS; protected **41850073063 WAITING**. Это не PASS и не разрешение обновить main. [Read-only production diff/порядок/backup/rollback](ZAPRUDA_PRODUCTION_READINESS_20261104.md). Нужны actual JWT, полный hosted mobile scope, реальные KING dependencies и отдельный owner release GO.

## D15: обязательные финальные gates
Все 56 ID/8 модулей/7 титулов сохраняются. Protected f3bbe1b SUCCESS установлен; поздняя UI-правка требует финальной проверки. Hosted Netlify four-width/two-theme/transaction scope и KING не закрыты. Новые пять feedback fixtures требуют отдельного точного cleanup; прежние шесть не повторять. До PASS каждого обязательного пункта main NO-GO.

## Итог исполняемой проверки c216963
13 ordinary CI SUCCESS,446 tests/37 files,9 Deno cases,26 targeted hosted layout/readiness PASS; все56 ID сохранены. Protected41850073063 SUCCESS относится к f3bbe1b. Для нового полного запуска нужны отдельно согласованная точечная очистка5новых feedback fixtures и сохранённое environment review. Full hosted/two-user/signup/recovery/physical keyboard, guide contract, genuine KING и проверенный production restore/migration contract остаются gates. **NO-GO, main не обновлён.** Последнее отдельное указание D18 запрещает main в текущей операции, даже если прежнее D15 давало условное разрешение. Доказательства: [FINAL_RELEASE_INTEGRATION](ZAPRUDA_FINAL_RELEASE_INTEGRATION_20261104.md).

## D18: выполненная точечная очистка и текущий защищённый запуск
Отдельное разрешение на прежние пять feedback UUID получено и исполнено: все guards PASS, DELETE5, независимый readback0. [JSON доказательств](../qa/product-contract/FEEDBACK_CLEANUP_41850073063_EXECUTED.json). Cleanup-блокировка именно этого набора закрыта; старые записи не тронуты повторно.
Текущий PR93 `4eba36702a62de0957fb2a0310b0aa6fa8913985` отличается от c216963 только `.github/pilot-e2e-request.txt`. Новый [protected41908405475](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41908405475) ожидает reviewer окружения staging-e2e; pending не заменяет whole-workflow PASS. Полная hosted приёмка, guide contract, genuine KING и production migration/restore gate остаются открыты. Будущие новые feedback-строки не входят в разрешённые пять. **NO-GO; main/Production/version/release прямо запрещены последним указанием владельца.**

## D19 — точный успешный JWT и отдельный визуальный Preview
Protected41908405475 / real-pilot126849136280 SUCCESS on4eba367; four distinct confirmed JWTs, actual API and authenticated localhost/STAGING browser, core/browser cleanup=true. Later Premium UI57c23c2 requires separate hosted acceptance. [JWT PASS](../qa/product-contract/PROTECTED_4EBA367_41908405475_PASS.json). Подготовленный Premium Preview не равен release GO; KING и production backup/restore/env/OAuth по-прежнему блокируют релиз. Новые feedback fixtures не удалены и не использованы для known-dirty rerun. Main/Production запрещены последним заданием.


## Сохранённый UI-кандидат 9c7fe6e — 05.11.2026
Актуальные точные UI/CI/read-only доказательства и оставшиеся gates: [Premium STAGING acceptance](ZAPRUDA_PREMIUM_UI_ACCEPTANCE_20261105.md).13ordinary CI PASS/450tests и40actual hosted layout/readiness не заменяют protected9c7 JWT,hosted multi-user,physical device,реальныйKING или production restore. Прошлый protected41908405475/4eba367 whole workflow SUCCESS. Новые5feedback fixtures не удалялись;предыдущая разрешённая метка readback0. Все56ID/8модулей/7KING сохранены. NO-GO/main/Production/version/release restrictions unchanged.
