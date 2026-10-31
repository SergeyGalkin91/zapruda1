# ZAPRUDA COMMUNITY — CANONICAL OWNER IMAGE REFERENCES

Design release: **v0.6.0-admin-rc.1**. Locked by owner. This document supplements `docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md`; it does not supersede its access/security rules.

## Reference hierarchy — owner-supplied visual materials
1. **DESIGN v 0.6.0 ZAPRUDA.png** — admin dashboard, club applications, finance triptych. It defines layout, emphasis, landscape hero, fee/action hierarchy. Figures, people, receipts, and dates are ONLY visual examples, never data.
2. **ГЛАВНОЕ МЕНЮ ДИЗАЙН(4).png** — chat room index with large heading «СВОИ НА СВЯЗИ», tabs «Все / Мои чаты / Непрочитанные», photograph avatars, muted purple counts, lime active indicators.
3. **ОСНОВА приложения(4).png** — room index and chat details, pinned messages, purple incoming/lime outgoing bubbles, media, reactions and composer. Keep public bottom nav Лента / Комьюнити / + / Выезды / Чат.
4. **Дизайн входа(4).pdf** — login card, auth fields, provider actions, dark/acid color treatment. Never show enabled OAuth until configured.
5. **кабинет администратора(1).pdf** — admin information architecture. New approved triptych above takes visual priority.
6. **свои на связи(4).pdf** — interaction/layout behavior; approved image triptych takes visual priority.
7. **стритфишинг(2).pdf** — urban fishing photography and street session card layout.

The owner uploaded these images in the project conversation. Do not replace them with AI-generated mockups. Store licensed production assets only when their rights are verified.

## Invariants
- Primary background near-black #070B10 / graphite #090B0C. Accent lime #D7FF35. Secondary muted lilac #A99AD9 or #B4A1D7. White headings.
- Use compact mobile cards with fine cool outlines, depth, strong photography, rounded avatars and buttons; not broad empty white surfaces.
- Italic angular ZAPRUDA wordmark, smaller COMMUNITY, outline fish. Do not reintroduce oversized old fish logo.
- Do not fabricate counts, times, online dots, unread badges, admin receipts or chats. Functional tabs only when there is real backing state; otherwise label as unavailable.
- Club creation fee 500 RUB, subject to authorized manual verification; never equate internal confirmations with bank deposits.
- Public navigation stays Лента / Комьюнити / + / Выезды / Чат. Admin content is separate and permission-gated.
- Before announcing implementation complete, run build, 390px screenshot comparisons against these references, functional smoke checks, and review the actual screenshots with owner.

## Progress
- This GitHub branch implements the shared palette, wordmark and chat room list styling. Other views remain pending detailed visual parity. The source images are design references, not an executable UI.
- No database, Auth, RLS, payment, production deployment or main merge implied.
