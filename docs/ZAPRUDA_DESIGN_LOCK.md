# ZAPRUDA COMMUNITY — APPROVED VISUAL STANDARD
Version: v0.6.0-admin-rc.1 / design lock 2026-10-31.
STATUS: DESIGN APPROVED by project owner. This is a DESIGN STANDARD, NOT proof of a deployed release or completed feature.
Supersedes ALL earlier concept boards, generic admin dashboards, old screenshots, and generic Lovable templates when they conflict.

## Canonical references
1. Owner-provided screenshots in ChatGPT on 2026-10-31: three mobile screens “СВОИ НА СВЯЗИ”, “СПОТЫ И ВОДА”, “СТАФФ” with the distinctive dark/lime/purple design.
2. Owner-approved follow-up mobile concept: three phones displaying “Кабинет администрации”, “Заявки на клубы”, and “Финансы”. Concept is visual ONLY: the data shown is illustrative, not real transactions. Do NOT replicate invented 12 500 ₽, 48 clubs, 136 guide bookings, persons, or other fake figures.
3. Existing ZAPRUDA logotype (bright lime handwritten/street brush lettering with fish mark) and current assets; avoid substituting an unrelated fish icon or redesigning logo.

## Nonnegotiable visual rules
- MOBILE-FIRST, near-black / charcoal background (#05090B to #11161A), subtle borders / dark glass cards.
- Primary neon lime #D7FF35: active tab, action buttons, key numbers, selected nav; black text on solid lime.
- Secondary subdued purple/lavender (#9E83D7 approximate): unread counters, message bubbles, low-priority labels and details. Do not overuse purple.
- White titles with bold condensed/clear Russian typography; muted lavender-gray auxiliary text.
- Real fishing photography: river dusk, street-fishing urban scenes, lure, reel, anglers. Dark, atmospheric outdoor aesthetic; never huge unstyled fish graphic or generic finance illustrations.
- Compact rounded image tiles and cards, clear spacing, rounded segmented filters, fine border strokes.
- Five-slot mobile bottom bar: Лента | Комьюнити | [+ lime circular CTA] | Выезды | Чат. Admin area is role-gated, not a replacement for public navigation; admin-specific bottom indicator may appear inside admin-only context without replacing public navigation.
- Chat list: heading «СВОИ НА СВЯЗИ», filters Все / Мои чаты / Непрочитанные; photo miniatures, purple unread counts, lime online markers. Chat screens: dark purple received bubbles, lime outgoing bubbles, attached fishing photo, slim composer, pin/attachment affordances.
- Admin pages match SAME mobile look, not a separate desktop-oriented control panel: Кабинет администрации (counts & quick actions), Заявки на клубы (status filters and details), Финансы (separate categories, not bank statement), Журнал заявок и бронирований, Обращения. Dark/lime/purple/fishing photos; precise figures only from authorized Supabase queries.
- Desktop is responsive adaptation of the mobile language, not a replacement design.

## Functional and security rules
- Do not use fabricated transactions, clubs, profiles, dates, finance values as real data.
- Client checks do NOT replace RLS/RPC; do not loosen auth to implement design.
- Never activate payments, mutate SQL/RLS or deploy without explicit approval.
- Reuse existing routes, existing backend and working functionality, avoid rewriting project.
- Preserve design across every screen (auth, profile, street fishing, chat, communities, admin, finance, reports). Supplied PDF mockups are earlier references for behavior/content, but latest owner-approved mobile shots supersede them visually.
- When implementing, compare screenshots against canonical references before requesting design approval; explain any unavoidable deviations.

## Cross-chat handoff
At beginning of EVERY future ZAPRUDA task read this file FIRST, then docs/ZAPRUDA_PROJECT_HANDOFF.md if available, and inspect current GitHub branch/PR/CI. The design is ALREADY APPROVED; do not propose older concepts or ask to re-approve unless user explicitly requests redesign.
