# Grok — P2 proposals (no implementation yet)
Date: 2026-11-01. Status: proposals only — await ChatGPT/owner approval before coding.

Design lock and brand colors unchanged. No invented communities, catches, or KPIs.

## Task 06 — Комьюнити (`src/routes/communities.tsx` and related)

**Now (typical):** Telegram CTA competes with or sits above in-app groups.

**Proposed order (content only, real data):**
1. Search communities / cities (existing search if present; otherwise keep placeholder disabled honestly)
2. My communities (RLS-scoped membership rows only)
3. Available local clubs/groups from Supabase (empty state if none)
4. Telegram ZAPRUDA COMMUNITY (external link, secondary card)
5. Contact admin / feedback entry

**Do not:** fabricate clubs, change membership RPCs, or restyle outside lock.

## Task 07 — Выезды (`src/routes/partners.tsx` or trips route)

**Now:** Tall hero «РЫБАЛКА ЛУЧШЕ ВМЕСТЕ» pushes actionable cards down.

**Proposed:**
- Cut hero vertical padding ~40–50% while keeping lime/graphite treatment
- Keep search + «organize trip» primary actions visible in first viewport (~390px)
- Card list unchanged in business logic (booking/responses untouched)

## Task 08 — Лента (`src/routes/index.tsx`)

**Now:** Large intro block delays real reports.

**Proposed:**
- Compact intro (title + one-line subtitle + primary CTA)
- Reports grid/list starts higher
- If zero public reports: explicit empty state («Пока нет публикаций») — no fake cards

## Task 09 — Новый отчёт (`src/routes/reports.new.tsx`)

**Mobile checklist (verify, minimal CSS only if broken):**
- Required fields marked and reachable without horizontal scroll
- Discipline / water body / location / photos sections stack cleanly at 390px
- Draft autosave behavior unchanged unless a P0 bug is proven
- Sticky or bottom primary submit with safe-area so keyboard does not hide actions

**Do not:** change draft schema, privacy defaults, or Street→report import rules without a separate ticket.

## Suggested implementation order after P0/P1 merge
1. Лента empty/compact (lowest risk)
2. Выезды hero trim
3. Комьюнити reorder
4. Отчёт mobile pass

Each item → own branch + Draft PR + 390px screenshot.
