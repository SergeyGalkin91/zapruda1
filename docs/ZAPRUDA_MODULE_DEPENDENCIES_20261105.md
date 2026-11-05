# Незавершённые модули и зависимости — 05.11.2026

Базовые56 ID/8 модулей сохранены. Статусы в таблице — снимок канонической матрицы #111 `a6ded87`, а не повышение статуса после новых тестов. Подробные требования, blockers и evidence остаются в `ZAPRUDA_FEATURES.json`.

| Модуль | ID / снимок статусов | Пользовательская связь | Реальные зависимости | Что остаётся |
|---|---|---|---|---|
| Общая платформа | 12 ID; IMPLEMENTED: 6, BLOCKED: 5, PLANNED: 1 | Auth, settings, profile, feedback, security, release gates | Auth + own profile/feedback RPC + private photo services | OAuth/signup/recovery, subscription/real payment acceptance and final release approval remain OPEN |
| COMMUNITY | 20 ID; IMPLEMENTED: 9, STAGING VERIFIED: 9, BLOCKED: 1, PLANNED: 1 | Feed/reports, chat, clubs, trips, guides, DMs, Atlas | reports/catches transaction; chat Realtime; membership/consent RLS; Atlas schema | Full hosted multi-account acceptance, guide booking contract errors; do not reinterpret general chat as ON SPOT+ |
| ZAPRUDA STREET | 4 ID; STAGING VERIFIED: 4 | STREET timer/session → report import | Account-scoped local session + actual report API | Prior STAGING evidence preserved; regression required on current candidate |
| FISHING MAP | 2 ID; IMPLEMENTED: 2 | Approved SPOT catalog/map | zc_public_spots, approved/reviewed and coarse public location | Actual approved lawful STAGING spots missing; private/exact GPS never copied |
| ZARUBA | 4 ID; IMPLEMENTED: 2, PLANNED: 2 | Competitions → BIG FISH / own application status | Existing STREET/UL gateway and real evidence/moderation + new own progress RPC | Full match formats/teams and title-linked real scenario not proven by route registration |
| TROPHY SYSTEM | 9 ID; IMPLEMENTED: 4, PLANNED: 3, BLOCKED: 2 | Verified catch → current title → profile/history | Existing categories/title_holders/history, moderator independence, evidence + new owner-only read | CARP/ICE/BOAT server flows + thresholds and genuine KING acceptance still OPEN; no moderator appointed |
| AI FISHING | 4 ID; IMPLEMENTED: 2, BLOCKED: 2 | Advice/assistant, separate OpenWeather | Existing protected Edge providers, quotas, own ai_daily_advices | Successful final providers/fallback/quota concurrency acceptance separate; no xAI rotation or quota bypass |
| SPOT MARKET | 1 ID; PLANNED: 1 | Existing market route | Approved future marketplace/real seller model | PLANNED: registration is not a completed marketplace; no real payment activation |

## ON SPOT+ — обязательное дополнение D22

OSP-01…09 — девять дополнительных P0, не замена и не перенумерация56 ID. `/on-spot` сейчас только вход/пустое состояние/fallback. Настоящие модерируемые зоны, opt-in membership, отдельное согласие presence/TTL, coarse privacy, взаимные приглашения, ограниченные opt-in анонсы, согласие на групповые фото и полный security E2E ещё не реализованы/не приняты. Все сохраняются обязательными.

## Сохранение незавершённых веток и PR

Полная инвентаризация95 веток и75 открытых PR: `qa/architecture-20261105/BRANCH_PR_INVENTORY.md`; JSON хранит SHA, ancestry и уникальные/эквивалентные patches. Кодовая база #93, канонические решения #111, цель release/v0.7.5-spot. Ни ancestry, ни эквивалентный patch не доказывают применение SQL или приёмку backend.

- #85 SPOT / #86 privacy: сначала сравнение с текущими server функциями, миграциями и реальным Storage, затем точечные дельты. Старые SQL не переигрывать.
- #98–#107 schema/Atlas/feedback: существование промежуточного PR не равно зависимости, которую нужно целиком слить. Сверять фактическую схему, файл и журнал миграций; #105 не применять вслепую.
- #63 historical integration, #89 Grok, #87 independent build: сохранить код и evidence; не обещать успешный upstream или production readiness по закрытию PR.
- Четыре группы общих HEAD (#110/#112, #109/#113, #88/#97, #71/#72) отмечены, но автоматически не закрываются. Уникальная работа остальных веток сохраняется.
- Реорганизация Git запрещена до отдельного review dependency/unique work. Здесь нет удаления веток, force-push, ретаргетинга или merge в main.

## Приоритет оставшихся gates

**P0:** подлинный positive KING (spot/moderator/evidence), все OSP-01…09, финальная защищённая и hosted приёмка точного кандидата, незакрытые обязательные product gates.

**P1:** guide booking/schema contract, полноценные CARP/ICE/BOAT award flows, OAuth/recovery/provider acceptance по канонической матрице. Приоритет P1 не отменяет отдельные P0 из неё.

**P2:** review устаревших/эквивалентных веток, техническая очистка после фиксации зависимостей; без самостоятельного удаления чужой работы.
