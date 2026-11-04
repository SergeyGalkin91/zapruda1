> **SUPERSEDED как единственная актуальная точка входа (04.11.2026).** Сначала читать [CURRENT_PRODUCT_SPEC](ZAPRUDA_CURRENT_PRODUCT_SPEC.md), [DECISION_LOG](ZAPRUDA_DECISION_LOG.md) и [UI_ACCEPTANCE](ZAPRUDA_UI_ACCEPTANCE.md). Исторические требования ниже не отменяют поздние прямые решения владельца. Референсы и доказательства сохранены; никакого автоматического отката интерфейса.

# ZAPRUDA COMMUNITY — APPROVED DESIGN LOCK

Design version: v0.6.0-admin-rc.1. Owner approval: 2026-10-31.
Status: visually approved; not a production software release or Git tag.


## FINAL OWNER VISUAL APPROVAL — 2026-11-01 (OVERRIDES ALL PREVIOUS MOODBOARDS)
The ONLY approved look is the five-phone hero image generated in the current ZAPRUDA project conversation, named **zapruda_community_неоновый_рыбацкий_интерфейс.png**. It depicts, left to right: login over sunset fishing landscape; «СВОИ НА СВЯЗИ» room list; «СПОТЫ И ВОДА» violet/lime room conversation; admin dashboard with sunset fishing hero; finance dashboard. **Use this exact image as the visual target for all subsequent app screens**. Preserve the following appearance across login, feed, communities, chat, street, profile, admin, applications and finance:
- near-black graphite/blue-black #070B10 and #090B0C; cool outlined cards, rounded corners, deep layered panels;
- vivid electric lime #D7FF35 for brand, active navigation, primary buttons and outgoing messages;
- muted lilac #A99AD9 and deep purple for secondary type, unread counters, incoming messages, metadata;
- angular italic neon ZAPRUDA wordmark, outlined fish mark, small tracked COMMUNITY;
- editorial white Russian headings, realistic fishing photography, compact high-density mobile interface;
- bottom public nav Лента / Комьюнити / + / Выезды / Чат; admin tab for authorized staff only.
Any earlier HTML demo, generic image-search examples, white/purple financial app screenshots, and alternate design mockups are **REJECTED** and must not be referenced as design. Existing older PDFs/images may inform functionality only when consistent with the five-phone image. Do not invent user data or receipts when implementing visual elements. The five-phone graphic itself is a reference/mockup, not proof that application screens have been implemented. Do not silently change this lock without new explicit owner approval.

## Reference priority
1. FINAL five-phone ZAPRUDA neon fishing interface image approved 2026-11-01; overrides the previous admin triptych.
2. The earlier owner-supplied chat and admin mockups only as supporting functional specifications, when consistent with reference #1.
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