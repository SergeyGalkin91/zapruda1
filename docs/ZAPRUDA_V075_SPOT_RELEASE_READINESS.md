# v0.7.5 SPOT — release readiness, 04.11.2026

**Настоящая core STAGING JWT-приёмка PASS; full app/public launch NO-GO.** Канонический PR93 → release/v0.7.5-spot, дизайн v0.6.0-admin-rc.1 сохранён. Зелёный CI и нижеописанный API PASS не заменяют hosted UI/оставшиеся security gates.

| Gate                                                      | Статус                       | Доказательство / ограничение                                                                                                     |
| --------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Environment branch blocker                         | DONE                         | Одна точная feature-ветка добавлена; required reviewer/admin-bypass protection сохранены                                         |
| Core schema                                               | DONE структурно              | 45 public tables/RLS; 8 наших дельт, adopted миграции не повторялись                                                             |
| Report/catch/retry/privacy                                | DONE JWT/API                 | 41759969230 source8273912; atomic failure/retry, foreign mutations, public→private фото, EXIF, GPS/Storage                       |
| Geographic/global chat/Realtime                           | DONE JWT/API                 | Настоящие message INSERT и photo INSERT/UPDATE; ready wait/rejoin reconciliation; гостевой и foreign denial                      |
| Own profile/gear/marks                                    | DONE JWT/API                 | Own RPC, private read/edit boundaries, concurrent one-primary-kit; #101 adopted                                                  |
| Feedback v2                                               | DONE JWT/API                 | 6 concurrent → 5 saves + 429, UI history/stranger boundaries, no Telegram; exact 5 QA UUID cleanup                               |
| 15/rolling-day cap                                        | DONE SQL / PARTIAL live      | Изолированный PG/PGlite boundary; не называть настоящим JWT time-window proof                                                    |
| TypeScript/lint/Vitest/build                              | DONE код                     | 421/33 локально, 0 lint errors; текущие результаты точного HEAD в Checks                                                         |
| PostgreSQL17/Deno/Docker/Node                             | DONE scoped CI               | Actual entrypoints incl STAGING broker; независимые SQL connections, rollback/reapply; latest HEAD in Checks                     |
| Browser 320/390/768/1440, 2 themes/3 engines              | PARTIAL hosted               | Guest/visual CI evidence; не авторизованный Netlify app E2E                                                                      |
| Netlify current deployment/UI                             | BLOCKED                      | Реальный Site ID/старый preview установлен; Team protection и OAuth read-only email consent; current SHA/env/bundle не проверены |
| DeepSeek primary/backup/cache/quota                       | BLOCKED                      | Реальный run41736781269 attempt3: YANDEX_KEY_MISSING, read-only quota preserved; OpenWeather PASS                                |
| Unconfirmed account                                       | BLOCKED live                 | Существующие 4 secrets confirmed; серверные/SQL guards не заменяют отрицательный Auth E2E                                        |
| Full live KING                                            | BLOCKED                      | Разрешённый независимый moderator + законный spot + подлинное evidence                                                           |
| Остальная schema/frontend совместимость                   | PARTIAL                      | 8 tables + Atlas view + 6 RPC/guide paid differences; #105 не применён                                                           |
| Lovable independence                                      | DONE build / PARTIAL hosting | Node/Docker source proof; опубликованный Lovable project не удалялся                                                             |
| Российский мобильный интернет                             | BLOCKED                      | Нужен физический замер без VPN                                                                                                   |
| Production privacy/media convergence                      | BLOCKED P0                   | Отдельные backup/legacy media/schema plan и разрешение                                                                           |
| Original AI cutover/main/prod/DNS/public release/payments | NOT STARTED                  | Отдельные разрешения; текущая приёмка ничего из этого не выполняет                                                               |

[Фактическая JWT приёмка](ZAPRUDA_STAGING_JWT_ACCEPTANCE_20261104.md) · [CURRENT_STATE](ZAPRUDA_CURRENT_STATE_20261104.md) · [Checks PR93](https://github.com/SergeyGalkin91/zapruda1/pull/93/checks). Точный актуальный SHA определять из PR; последующие docs/checkpoint commits не превращают старый run в новый PASS.
