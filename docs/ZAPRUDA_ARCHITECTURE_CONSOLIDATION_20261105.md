# Architecture consolidation — 05.11.2026

> **Текущий код #93: `8777e4ffbe43211ffcb04dba968dcfe28a149bcd`. Обычные workflow13/13 SUCCESS; Vitest483/42 файлов PASS. Это не release approval.**

## Подтверждённые проверки текущего кандидата

| Workflow | Результат |
|---|---|
| [v0.7.1 Meetup security guards](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941550534) | SUCCESS |
| [ZAPRUDA Electric Blue cross-browser review](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547906) | SUCCESS |
| [Netlify preview STAGING isolation guard](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941548003) | SUCCESS |
| [Yandex canary Deno typecheck](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547830) | SUCCESS |
| [SPOT isolated PostgreSQL transaction races](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547950) | SUCCESS |
| [ZAPRUDA Docker image smoke test](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547816) | SUCCESS |
| [Independent Node hosting proof](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547815) | SUCCESS |
| [Report photo privacy browser check](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941548037) | SUCCESS |
| [ZAPRUDA checks](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547954) | SUCCESS |
| [ZAPRUDA Frontend Build](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941548212) | SUCCESS |
| [Advisor availability without an AI provider](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547813) | SUCCESS |
| [Pilot schema PostgreSQL and Deno checks](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941547875) | SUCCESS |
| [v0.7.1 Meetup mobile browser smoke](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941548254) | SUCCESS |

Изолированный гостевой Premium UI: **Chromium/Firefox/WebKit ×320/390/768/1440 ×2 темы**,264 проверки /168 PNG, по88 проверок и56 PNG на движок. Архив GitHub artifact `13376359978`, SHA256 `1a6775ff10894f30f0b7a50ed9d9a12ad41469e5b986f14b651d1fcc351e45cb`, исходный SHA8777e4f. Это настоящие рендеры приложения на изолированном гостевом backend, а не hosted/JWT acceptance. SQL/rollback9 +1 проверка размещения STAGING delta входят в483.

Netlify deploy `6aebcd9de9da0d32615233d1` связан с этим SHA через Netlify GitHub status; статус `Deploy Preview ready!`. Доступ в текущем проверочном браузере закрыт Team protection. Единственный актуальный protected run —41941541992; требуемое действие владельца указано ниже.

Target: **0.7.6 KING FINISH ON SPOT+**, technical package remains 0.7.5. Source: code9c7fe6e, canonical specification a6ded87/D22. The latest owner asks for one screen/transition map, a dependency inventory, a continuous catch → BIG FISH → independent review → title → profile journey, and integration with the existing Premium UI. Main/Production remain prohibited. No previously working module is being rewritten or removed.

## Read-only findings before edits

[Complete branch/PR inventory](../qa/architecture-20261105/BRANCH_PR_INVENTORY.md), [machine-readable snapshot](../qa/architecture-20261105/branch-pr-inventory.json):95 remote branches,75 open PRs,4 groups sharing a head. Unique patches, equivalent patches, ancestor status and PR targets are recorded. No branch/PR deletion, retarget, merge, history rewrite, or old migration replay is authorized by an inventory result.

Confirmed breaks on9c7fe6e:
- `reports.new.tsx` saves the real report/catches atomically, then returns to feed without a BIG FISH transition.
- `SpotCatchFlow` already implements upload/status/review/revoke against the existing Edge gateway; it is buried at the end of competitions. Reuse it instead of making another catch system.
- The profile displays activity/XP, but no server-authoritative current KING titles or title history. `public.zc_spot_my_progress()` does not exist in actual STAGING.
- The SPOT gateway shadows the global URL constructor with its backend URL string; every non-null browser Origin is rejected. Its allowlist also omits immutable owned Netlify deployments. Its JWT, independent moderator and evidence guards must remain.
- ON SPOT+ is approved mandatory scope OSP-01…09, but has no membership/presence/invitation backend in STAGING. Existing country/geographic chat is not a moderated waterside-zone membership system. Do not rename it and claim those gates passed.

## Implementation boundary / security design before schema edits

1. Keep existing report persistence/idempotency/photo processing and existing SPOT catch/review/revoke APIs. Add explicit navigation and a short-lived, account-scoped, optional handoff of **one** selected fish's species/weight/length. Never copy coordinates, original photos, evidence keys, authentication values or a `verified` claim. The user must select a lawful reviewed SPOT, actual time and private proof independently; no automatic record submission or title.
2. Add one read-only no-argument owner progress RPC in STAGING. SECURITY DEFINER is necessary because private SPOT tables intentionally cannot be read by a browser. It must use a fixed search_path, require a confirmed non-anonymous current Auth user, restrict every catch/title/history row to that user, return only allowlisted fields, limit results and revoke PUBLIC/anon EXECUTE. No caller-supplied user ID or authorization from user_metadata. No new title-award logic, table grants, RLS relaxation or original-evidence exposure.
3. Profile crowns come only from current server title_holders joined to a lawful verified owned catch and approved evidence/scope. Activity XP and report counts never create a KING. Revocation/re-election must be reflected by a fresh authoritative read. History must disclose only the current user's events, not another fisher's private catch or location.
4. Preserve gateway JWT verification and user-scoped RPCs. Allow only the existing site’s HTTPS deploy-preview/24-hex immutable hosts plus explicit loopback development origins; reject other projects, suffix tricks, opaque origins and Production deployment of this STAGING-only gateway.
5. ON SPOT+ entry may provide honest existing-catalog/empty/denied navigation, but OSP-01…09 remain PARTIAL/BLOCKED until zone policy, opt-in membership, independent presence consent/TTL, block/privacy controls, mutual invites, inbox/rate limits and group-photo consent are genuinely implemented and accepted. No passive geolocation, fabricated presence, fake local groups or duplicate chat schema.

## Verification and genuine blockers

Local SQL fixtures/role simulation and mocked component tests are isolated technical regressions, not signed JWT E2E. Real JWT tests must use existing protected STAGING accounts, preserve secret boundaries, reject unapproved catches/unauthorized review, prove owner-only progress reads and report all positive KING gaps explicitly.

Actual STAGING inventory at start:0 moderators,0 approved public SPOT,0 private SPOT catches/evidence/title holders. A genuine positive catch→independent review→KING→profile flow needs an owner-authorized independent moderator, a real lawful approved SPOT and genuine evidence. Do not assign roles, fabricate locations/catches, use SQL fixtures as JWT proof, or mark the whole release accepted. Existing feedback fixtures from previous runs are outside this work's cleanup boundary.

All56 legacy IDs/8 modules/7 KING and OSP-01…09 remain obligations. This architecture work does not defer them, approve a release, alter main/Production/DNS/payments, or bump a version. Final code/evidence/statuses are appended after verification.

## Implemented delta (verification candidate)

- Added `/big-fish`, explicit post-report one-fish handoff and return paths to real server review/status/profile. Existing persistence, evidence, review/revoke and idempotency engines remain.
- Added profile own progress with actual statuses, authoritative current crowns and own title history; stale/pending/unlawful/missing-evidence catches cannot appear as current crowns.
- Applied only new STAGING RPC migration `20261105000601_v076_owned_spot_progress`; isolated SQL/rollback9 PASS. No table grants or RLS changes.
- Deployed only STAGING `zapruda-spot-records` v12 with verify_jwt=true; corrected URL shadowing, strict owned preview origins and STAGING-only project fence. Legacy v11 source was captured before replacement.
- Added `/on-spot` entry and links without false membership/presence implementation. Full OSP-01…09 remain P0 open.
- Local TypeScript, build, Deno exact gateway imports and483 Vitest tests PASS. ESLint has no errors; baseline fast-refresh warnings remain. Ordinary CI13/13 now PASS; protected real JWT/browser evidence remains BLOCKED before runner review.
- New scoped protected architecture workflow reuses existing live SPOT and browser suites; excludes pre-existing feedback fixture set and does not consume model quotas. Positive KING remains blocked by genuine prerequisites.

## Карта, ветки и независимые модули

- [28 router definitions /6 ключевых переходов](ZAPRUDA_SCREEN_MAP_20261105.md), JSON registry и `node scripts/check-route-graph.mjs`: PASS. Проверка существования маршрутов не считается работающим backend.
- [8 модулей и незавершённые зависимости](ZAPRUDA_MODULE_DEPENDENCIES_20261105.md); все56 ID сохранены, SPOT-03 повышен только до IMPLEMENTED, без ложного E2E VERIFIED.
- Стартовый95 branches/75 open PRs/4 shared-head groups: `qa/architecture-20261105/BRANCH_PR_INVENTORY.md`. После кода: `qa/architecture-20261105/final-code/BRANCH_PR_INVENTORY.md`; исходный snapshot сохранён. Сверка старого snapshot после движения ref намеренно отклоняется; для нового среза получен свежий GitHub snapshot. Ни одна ветка не удалена и PR не закрыт.

## Точный проверяемый код и STAGING

Финальный функциональный SHA: `8777e4ffbe43211ffcb04dba968dcfe28a149bcd` в #93. Коммиты: `8777e4f` — STAGING SQL вынесен из автоматических Production migrations и проверен отдельным scope-тестом; `f1d9b70` — новые связи и owner progress/CORS; `85a5bd0` — очистка устаревшего переноса после успешного no-catch отчёта и корректные браузерные assertions; `1dd8c8f` — существующий themed field/48px для выбора одной рыбы. Нет bump/тега/релиза.

STAGING `yudtbifopfnjtjanaqrd`: миграция `20261105000601_v076_owned_spot_progress` применена ровно один раз. Тело RPC: MD5 `e52618251fbcee5cd12f3f044e50c047`, совпадает с репозиторием; stable/security definer, фиксированный search_path, anon EXECUTE=false, authenticated EXECUTE=true, private schema USAGE=false, private catches SELECT=false, public CREATE=false. Девять isolated PostgreSQL проверок включают настоящий SQL review/revoke и rollback только RPC; это не подписанный JWT и не настоящий улов.

Edge `zapruda-spot-records` v12 ACTIVE, verify_jwt=true; оба readback-файла `index.ts`/`origin.ts` совпадают с репозиторием. Проблема v11: строковая константа URL затеняла глобальный конструктор URL, поэтому браузерный Origin отклонялся; дополнительно не было immutable host. Теперь backend-константа переименована, Origin вынесен в отдельный модуль со строгим allowlist своего сайта. Другие функции и Production не развёртывались.

Оставшиеся security advisories не скрыты: intentional deny-by-default private RLS tables, intentional confirmed-owner SECURITY DEFINER RPC (новая функция разобрана выше), существующее предупреждение leaked-password protection. Не отключены RLS/reviewers и не расширены private table grants.

## Настоящая E2E и hosted — текущие ограничения

Защищённый [41941541992](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41941541992) ожидает **Review deployments → staging-e2e → Approve and deploy** владельцем. Только этот запуск актуален;41939384974/41940006418/41940382100 отменены как заменённые, без выдачи secrets runner. Новый scoped workflow использует существующие четыре подтверждённых аккаунта, реальные JWT, browser Origin, чужой аргумент RPC/guest/неразрешённую загрузку и реальный UI private-report → выбор одной рыбы → BIG FISH → профиль. До фактического выполнения это BLOCKED, не PASS. Гостевые скриншоты и SQL-фикстуры не подменяют данный gate. Неподтверждённый аккаунт проверен в SQL/component regression; реальный неподтверждённый JWT не заявлен.

Netlify подтвердил `Deploy Preview ready!` для точного SHA; Site ID `3a98edc7-c77f-45f8-9fe0-7a156c72abf5`, [preview](https://deploy-preview-93--zapruda1.netlify.app). Preview-only build helper запрещает другой Supabase URL и требует40-символьный COMMIT_REF; STAGING isolation CI проходит. В текущем проверочном браузере наблюдается Team protection / **This site is private — Sign in with an invited Netlify account**. Hosted UI/network/мобильная приёмка нового кандидата не объявляется PASS. Защита доступа сохранена; предыдущая hosted приёмка9c7fe6e остаётся историческим evidence.

Positive KING по-прежнему BLOCKED:0 модераторов,0 approved lawful SPOT,0 private SPOT catches/evidence/title holders на момент сверки. Требуются разрешённый независимый модератор, реальная законная точка и подлинное доказательство. Нет назначения ролей, поддельного публичного улова/спота, сброса квот, расхода AI generation quota или очистки чужого feedback fixture set.

## Четыре обязательных результата

| Результат | Статус | Граница |
|---|---|---|
| Единая карта экранов/переходов | DONE |28 routes/6 key transitions + automatic dangling-link check; не backend acceptance |
| Инвентаризация веток и незавершённых модулей | DONE |95 branches/75 PRs/4 shared-head groups +8 modules/56 IDs/OSP contract; без реорганизации |
| Улов → BIG FISH → проверка → титул → профиль | PARTIAL / BLOCKED |Реальные engines связаны; private owner progress в STAGING; подписанный тест ждёт review, positive KING требует подлинных условий |
| Интеграция в Premium UI | PARTIAL |Реальные route/components/themes сохранены; ordinary isolated browsers проверяются; hosted private access и owner phone acceptance OPEN |

ON SPOT+: безопасный вход/fallback реализован; moderated zones/membership/presence/invites и полные OSP-01…09 **NOT STARTED / BLOCKED**, обязательные P0. Всё это сохраняется в текущей цели0.7.6 KING FINISH ON SPOT+; полного релиза/пилотного GO нет.

STAGING isolation: the new SQL delta is stored in `supabase/staging/20261105000601_v076_owned_spot_progress.sql`, outside automatic Production migrations. An isolated regression checks that no copy exists in `supabase/migrations`; the already deployed RPC body and Edge sources are unchanged.

Полная [карта112 статических переходов](ZAPRUDA_SCREEN_TRANSITIONS_20261105.md) из фактического кода дополняет6 критических связей;28 route definitions включают admin-layout и index. В CI #111 добавлена сверка карты с исходниками. Приватные/динамические и auth-переходы по-прежнему требуют настоящей E2E, которая ждёт review. Дополнительная проверка STAGING-only размещения SQL увеличила общий Vitest до483; девять SQL/rollback регрессий сохранены, новых действий в базе не было.
