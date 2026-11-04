# v0.7.5 SPOT — release readiness, 04.11.2026

**NO-GO публичному запуску; кандидат для настоящей STAGING-приёмки.** Канонический PR #93 → SPOT. Main, production, DNS и платежи не изменены.

| Gate                                                    | Статус                        | Доказательство / оставшееся ограничение                                                                                  |
| ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Core STAGING schema                                     | DONE структурно               | 45 public tables/RLS; 7 новых дельт, exact history/source readback; adopted migrations не повторялись                    |
| Отчёт/catches/retry                                     | DONE код/SQL                  | atomic invoker RPC, catch failure rollback, captured actor/token, draft; no-catch независим; новый JWT gate отдельно     |
| Chat safe media / refresh                               | DONE код/deploy               | две JWT v1 функции, exact 5-file readback; no direct Storage signing; lifecycle/component/SQL проверки                   |
| Own gear/marks/profile/activity                         | DONE структурно               | owner-only RLS/column grants; no self-awarded beta status; primary kit serialized                                        |
| TypeScript/lint/Vitest/build                            | DONE локально                 | 410 тестов/32 файла; 0 lint errors/6 старых warnings; точный итоговый HEAD в PR Checks                                   |
| PostgreSQL17/Deno/Docker                                | DONE на d58836c               | runs 41747680477 / 41747680552; последующие SQL/client изменения требуют текущего HEAD                                   |
| Browser 320/390/768/1440, 2 themes, 3 engines           | DONE guest на d58836c         | run 41747680365; итоговый marker запускает свежую проверку                                                               |
| Настоящий private-photo/SPOT JWT baseline               | DONE ограниченно              | 41729999695; не полная модерация/KING и не новый public-toggle                                                           |
| Public→private HTTP / chat Realtime / full core JWT     | PARTIAL                       | защищённый pilot-staging-jwt workflow подготовлен; требуется фактический PASS и cleanup                                  |
| Полный live KING                                        | BLOCKED                       | нет разрешённого модератора/проверенного реального спота/подлинного evidence                                             |
| DeepSeek primary/backup/cache/quota                     | BLOCKED                       | canary v2; run 41736781269 не дошёл до runner, нужен текст Annotations                                                   |
| Остальная frontend/schema совместимость                 | PARTIAL                       | 8 таблиц + Atlas view + 6 RPC, guide/paid columns остаются; не включать в пилот без собственной приёмки                  |
| Lovable build independence                              | DONE сборка / PARTIAL hosting | зависимость/lockfile исправлены ранее; Node/Docker proof; опубликованный проект не удалён, внешний hosting не переключён |
| Российский мобильный интернет без VPN                   | BLOCKED                       | нужен физический замер, CI runner его не заменяет                                                                        |
| PROD privacy/media convergence                          | BLOCKED                       | отдельный план, backup, обработка legacy originals и разрешение                                                          |
| Original-route Yandex cutover, production, DNS, release | NOT STARTED                   | отдельное разрешение после PASS; XAI secrets сохранены                                                                   |

[Current state](ZAPRUDA_CURRENT_STATE_20261104.md) · [Ordered schema/deploy evidence](ZAPRUDA_STAGING_SCHEMA_ALIGNMENT_20261104.md) · [Dependency matrix](ZAPRUDA_STAGING_DEPENDENCY_MATRIX_20261104.md) · [PR Checks](https://github.com/SergeyGalkin91/zapruda1/pull/93/checks).

Зелёный CI не означает, что приложение целиком принято. Утверждённый дизайн/темы/навигация сохранены; wizard, unread receipts, новые лиги и неподтверждённые trophy thresholds не считаются реализованными этой консолидацией.
