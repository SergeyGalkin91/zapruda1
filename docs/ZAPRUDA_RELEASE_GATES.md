# ZAPRUDA — условия следующего обновления
04.11.2026. Контракт DRAFT. Техническая база v0.7.5 SPOT; целевой релиз 0.7.6 KING FINISH. Текущие результаты: [FINAL_ACCEPTANCE](ZAPRUDA_FINAL_ACCEPTANCE_20261104.md).
**Релиз NO-GO до закрытия обязательных gates и отдельного решения владельца.**

## Состав пилота
P0 из FEATURE_MATRIX — обязательные критерии уже запрошенной приёмки. P? — предлагаемый состав для утверждения, FULL — полный продукт/поздняя очередь без автоматического переноса. Не объявлять весь продукт обязательным к одномоментному выпуску; не исключать незавершённые функции из обязательного плана.
Для принятия состава: владелец утверждает конкретный список feature IDs, принимает остаточные риски и явно решает каждое исключение. До этого никакой DEFERRED/GO.

| Gate | Необходимое доказательство | Сейчас |
|---|---|---|
| G0 требования | все согласованные идеи имеют ID, код/пробел, критерий, владельца решения и scope | DRAFT матрица в этом PR; ревью открыто |
| G1 стабильность | вход/confirm/recovery/выход, feed reload без FK ошибки, профиль save/readback, все P0 переходы | OPEN; FK по PR #110 применена, live открыт |
| G2 chat | два реальных JWT, Realtime/text/photo/reaction/reply, reconnect и unread/read receipts | OPEN для полной приёмки; mine/unread/read-state реализованы, требуется положительный A→B Browser E2E |
| G3 report | 3 шага, no-catch, draft/reload, privacy, retry без дубля, atomic catches, фото/GPS/EXIF | OPEN для полной приёмки; 3 шага реализованы, требуется signed-in publish/retry E2E |
| G4 UI | before/after 320/390/1440, обе темы, последние референсы, контраст/focus/keyboard/no overflow | OPEN; см. UI_ACCEPTANCE |
| G5 безопасность | guest/owner/outsider/разрешённые роли, RLS/ACL/RPC/Storage, закрытые оригиналы, JWT isolation | OPEN; тесты и старые snapshot не live |
| G6 STREET/SPOT/KING если в пилоте | сессия → opt-in report; реальный legal SPOT/evidence; независимая модерация, tie/race/revoke/history/notifications | OPEN; нельзя подделывать данные/роли |
| G7 backend/deploy | свежий read-only STAGING inventory, сверка с нужными контрактами, deployed SHA = tested SHA, только STAGING в preview | OPEN; не повторять applied миграции |
| G8 CI | typecheck/lint/tests/build + необходимые SQL/browser checks на exact code SHA, изучить skipped/failed jobs | quality PASS на d41f02f; остальные exact-head результаты в FINAL_ACCEPTANCE |
| G9 AI если включён | актуальная погода, primary/backup, Web Search OFF, quota/cache/failure/privacy live | OPEN; cutover требует отдельного разрешения |
| G10 пилот и версия | owner-approved scope + приёмка + явное разрешение конкретной версии | OPEN; автоматический bump/tag/release запрещён |

## Обязательная запись на каждое обновление
В PR: базовый SHA → кандидат SHA, список всех feature IDs текущего релиза, before/after статусы, ссылки на тесты/скриншоты/live evidence, известные ошибки. Для каждой незавершённой функции: сохраняется обязательство, зависимость, следующий шаг; исключение из релиза — ссылка на решение владельца. Новый green CI не переносит старую E2E-приёмку на другой код автоматически.
Формат evidence: ID → SHA → окружение/project ref → дата → сценарий/роль → ожидаемое/полученное → артефакт → ограничения. Секреты и личные доказательства не публикуются.

## Контроль без ложного обещания автоматизации
В этом PR добавлен GitHub Actions product-contract: проверяет 56 исходных ID по неизменяемому коммиту 1fa7684, дубли, поля/статусы, согласованность JSON/Markdown, source paths и локальные ссылки документов. 6 отрицательных/положительных regression tests. CI не даёт release GO и не меняет branch protection. Пока PR #111 не принят, workflow не присутствует в интеграционной ветке #93. Ручное ревью и решение владельца остаются обязательными.

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
