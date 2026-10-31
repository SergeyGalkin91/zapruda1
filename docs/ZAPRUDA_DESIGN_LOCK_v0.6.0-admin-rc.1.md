# ZAPRUDA COMMUNITY — APPROVED DESIGN LOCK

Design version: v0.6.0-admin-rc.1. Owner approval: 2026-10-31.
Status: visually approved; not a production software release or Git tag.

## Reference priority
1. Latest owner-approved three-mobile-screen admin image from 2026-10-31 (admin dashboard, club requests, finance). This supersedes previous collage and generic admin theme.
2. Owner-supplied «СВОИ НА СВЯЗИ» mobile mockups (chat list and rooms).
3. Owner-supplied «ГЛАВНОЕ МЕНЮ ДИЗАЙН», «ОСНОВА приложения», auth, admin, streetfishing references.
4. Actual application code determines behavior and factual data, not a reason to replace the visuals.

## Locked visual design
- Mobile-first. Nearly black/graphite surfaces; dark cards with subtle cool borders. No white default backgrounds.
- Electric lime #D7FF35 is the primary active/CTA color; subdued lavender/purple for inactive tabs, bubbles, counters, labels.
- Distinct italic ZAPRUDA wordmark, smaller COMMUNITY, outlined fish mark. Never substitute old oversized purple fish on white background.
- High-contrast Russian typography, large white headings, compact lilac-muted descriptions and spacious tap targets.
- Angling/streetfishing imagery: fish, tackle, actual riverbank and urban waters. Never invent user reports or receipts.
- Public mobile navigation: Лента / Комьюнити / + / Выезды / Чат. Admin navigation is restricted to authorized staff and must not replace the public Chat tab globally without approval.

## Screen contracts
- Chat «СВОИ НА СВЯЗИ»: tabs Все / Мои чаты / Непрочитанные, photo avatars, times, purple unread pills and lime dots. Actual counts only. Rooms with pinned message, incoming lavender bubbles, outgoing lime bubbles, photos, reactions and composer.
- Admin dashboard: ZAPRUDA header, fishing landscape hero, three live KPIs (club applications, guide checks, feedback), four dark actions (moderation, finance, feedback, journal).
- Club moderation: tabs waiting / confirmed / declined only when these states and filters exist; actual fee is 500 RUB, not conceptual image figures. Payment confirmation requires server authorization and verified receipt.
- Finance: clearly segregate pending, administratively confirmed, commission and liabilities. Never present estimates as bank settlements.

## Regression rules
- No rollback to old white/grey theme, obsolete collage, logo or alternate palette.
- No silent design changes, new global navigation or fake analytics. Any new design requires the owner's explicit approval and a new design lock revision.
- Never alter auth, RLS, payment processing, tables or production merely for cosmetic similarity.
- Every UI PR must be checked against the latest approved reference at mobile 390 px and desktop; include real screenshots and confirm style loads.

## Cross-chat handoff
Read this file first, then docs/ZAPRUDA_PROJECT_HANDOFF.md and AGENTS.md. Refer to v0.6.0-admin-rc.1 as the approved visual baseline. Do not claim the app's live interface already matches this concept; implementation and QA are still separate tasks.