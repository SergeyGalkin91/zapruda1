# v0.7.5 SPOT — release readiness

Дата: 04.11.2026 (Москва). Решение: **NO-GO публичному запуску; кандидат для STAGING-приёмки**.

| Gate | Состояние | Evidence / ограничение |
|---|---|---|
| База SPOT: TypeScript/lint/unit/build | DONE | 3a43ed6, 329 тестов; GitHub run 41733556438 |
| Docker/независимый Node | DONE | runs 41733556464 / 41733556481; внешний hosting не переключён |
| Браузеры 390/1440 | DONE на базе | run 41733556506; не доказательство полного authenticated UX |
| Фото transport/EXIF/GPS ACL/чужой доступ | DONE в STAGING | protected run 41729999695, отдельный шаг PASS; только private QA fixture |
| Public→private немедленный запрет gateway | PARTIAL | unit/SQL доказательства и no-store gateway; действительный public-toggle HTTP сценарий не заявлен |
| KING revoke/races/retry | PARTIAL | 7 SQL unit и 5 real PostgreSQL multi-session rounds; hosted source/ACL readback; не live moderator JWT |
| Полный live KING | BLOCKED | нет разрешённого модератора и законного проверенного спота/реального evidence |
| DeepSeek primary/backup | PARTIAL | реализация canary и protected workflow; нужен фактический PASS upstream |
| Legacy cleanup | PARTIAL | нейтральный клиент, изолированная canary; XAI runtime до отдельного cutover |
| UX wizard, chat receipts, 320/768 | NOT STARTED на этом срезе | approved spec не равен реализованной функции |
| PROD privacy/schema convergence | BLOCKED | отдельное разрешение, backup и обработка legacy фото |
| Россия мобильная сеть без VPN | BLOCKED | нужен физический сетевой замер всей цепочки |

Никакого merge PR, публичного релиза, main/production deployment, покупки кредитов, платежей или самоназначения модератора данным документом не разрешается. Статусы обновляются только по фактическому Actions/source/hosted evidence.
