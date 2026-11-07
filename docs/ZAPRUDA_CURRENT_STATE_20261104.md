> **Актуальный P0, 05.11.2026:** #93 `37eb39aa92e55607e58234f264da0470c973fe10` — полный защищённый [41957327094](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41957327094) **PASS**,13/13 обычных workflow,484 Vitest. [Точные результаты и BLOCKED-этапы](ZAPRUDA_E2E_FINAL_ACCEPTANCE_20261105.md). Положительный KING и hosted Netlify mobile не приняты. ON SPOT+ продолжается отдельно в [PR114](https://github.com/SergeyGalkin91/zapruda1/pull/114), без применения новой дельты. Цель D22 **0.7.6 KING FINISH ON SPOT+**, версия0.7.5;56 ID/8 модулей/7 KING/OSP-01…09 сохранены. **Main/Production/release NO-GO.**

# Текущее состояние — ZAPRUDA v0.7.5 SPOT, 04.11.2026

**Защищённый JWT E2E PASS; публичный запуск пока NO-GO.** Канонический [PR #93](https://github.com/SergeyGalkin91/zapruda1/pull/93) → `release/v0.7.5-spot`, head `feat/ai-yandex-deepseek-staging`, work mirror `work/v075-consolidation-20261104`. Определять точный актуальный HEAD из GitHub, а не из старого текста PR. Дизайн v0.6.0-admin-rc.1, обе темы и пять вкладок сохранены.

## DONE

- Снят точный GitHub blocker: в `staging-e2e` добавлена только ветка `feat/ai-yandex-deepseek-staging`; reviewers/остальные защиты и защищённые секреты сохранены.
- **[41759969230](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41759969230), source 8273912: все 3 шага PASS** — настоящие core JWT/API/Realtime, feedback v2, SPOT negative preflight. Четыре существующих разных confirmed users, без JWT-эмуляции или privileged CI key.
- Реальные private report/catch/atomic retry/rollback, public→private HTTP фото и EXIF, GPS/Storage denial, оба чата/реакции/фото, Realtime INSERT+UPDATE, foreign mutation denial, own profile/gear/primary kit, отдельная погода. [Точные сценарии, ограничения, очистка](ZAPRUDA_STAGING_JWT_ACCEPTANCE_20261104.md).
- `abe95b4`: принят fix #101 private bio через own RPC с совместимостью только при отсутствующем RPC; шесть component-регрессий. Пустой guest photo 404 не считается утечкой: статус и отсутствие изображения проверены.
- `cc44a18`: настоящим JWT воспроизведены и исправлены feedback history 42501 и конкурентный обход лимита 5/час. Восьмая дельта **20261104021404 v075_feedback_atomic_limits**, service-only invoker RPC + собственный user_id read; direct writes/body/contact по-прежнему закрыты.
- Feedback v2 ACTIVE / JWT=true, exact source readback, STAGING-only URL guard и исходники вне автоматического production пути. Telegram-кода нет. **6 параллельных POST → 5 × 201 + 429**, собственная история/чужая приватность PASS. Только свои 5 QA UUID очищены; ранее очищены ровно 6 из воспроизведения v1.
- `8273912`: чат ждёт PostgreSQL readiness, обновляет историю при ready/rejoin без потери черновика. Live тест требует настоящего события; polling не заменяет Realtime. Один дополнительный component regression.
- STAGING: **45 public tables / все RLS**, семь прежних точечных дельт и adopted #98–#107 сохранены, не переиграны. Chat upload/access v1, report upload v7/access v2, SPOT v11, OpenWeather v11 сохранены.
- После cleanup 02:23 UTC: 0 public reports/catches/messages/chat photos/feedback/QA Storage objects; прежний один private report сохранён. Нет fake public fish/spot/moderator.
- **421 Vitest / 33 файла** локально; PostgreSQL17 независимые соединения/5 серий feedback races/15/day limit/rollback, Deno actual entrypoints PASS. Все текущие CI/браузеры — в [Checks](https://github.com/SergeyGalkin91/zapruda1/pull/93/checks), проверять точный HEAD.

Отчёт без улова по-прежнему не зависит от catches/RPC. Ошибка внесённого улова останавливает публикацию в одной транзакции; per-account draft сохраняется. Чужие приватные данные, координаты и оригиналы не открывались ради тестов.

## PARTIAL / BLOCKED

1. **Netlify:** установлен реальный Site ID 3a98edc7-c77f-45f8-9fe0-7a156c72abf5 и старый PR54 preview/deploy/source e1288d4. Реальная страница закрыта Team protection; current v0.7.5 deployed SHA, env/bundle и hosted browser login не подтверждены. OAuth read-only email для Netlify Auth отклонён automatic review до отдельного явного согласия. Не отключать защиту/не создавать новый site.
2. **Yandex:** branch blocker снят, run 41736781269 attempt 3 реально исполнился. Погода PASS; primary/backup diagnostics **YANDEX_KEY_MISSING**, квота сохранена. Нужен доступный `YANDEX_AI_API_KEY` в STAGING, затем folder/IAM/model/upstream acceptance. Это не новая причина менять XAI key. Canary v2 и original legacy v14 остаются раздельны.
3. **Схема:** остались 8 клиентских таблиц + my_atlas_progress view + 6 RPC/guide paid differences. #105 просмотрен, без применения: необходимы отдельные evidence/actor/view tests. [Матрица](ZAPRUDA_STAGING_DEPENDENCY_MATRIX_20261104.md).
4. **Unconfirmed/live KING:** живой unconfirmed-account тест не выполнен имеющимися четырьмя confirmed secrets. KING требует разрешённого независимого модератора, законного real spot и подлинного evidence. SQL fixtures/guards не заменяют эти JWT gates.
5. **Публичный запуск:** production privacy/media drift, full hosted UI и российский мобильный замер остаются отдельными gates. Production/read-only migration inventory 62/latest 20261101204210; ничего не изменено.

## NOT STARTED / отдельные разрешения

Original-route AI cutover — только после настоящих primary/backup PASS и отдельного согласия; legacy secrets сохраняются. Main/production merge/deploy, DNS, public release, реальные платежи не выполнялись. Не назначать роли и не создавать публичные точки ради тестов. Существующий PR108 → main не объединялся; канонический PR93 остаётся draft. UX-spec не равен реализации wizard/unread/future leagues/trophy thresholds.

Полное доказательство текущего продолжения: [STAGING JWT acceptance](ZAPRUDA_STAGING_JWT_ACCEPTANCE_20261104.md). Исторические записи о недоступных Annotations/31-table срезе не переопределяют это состояние.
