# ZAPRUDA COMMUNITY — v0.7.0 REDESIGN VERSION

Status: **release candidate / NOT deployed**.

Owner approved the **single five-phone neon fishing design** on 2026-11-01. Source design reference: `zapruda_community_неоновый_рыбацкий_интерфейс.png` from project conversation. Only this appearance is acceptable. The app's original functions and access controls must be preserved.

## Release definition
- Product/version: ZAPRUDA COMMUNITY v0.7.0 — Redesign Version.
- Base: integrated PR #12 code, design changes in PR #14.
- Style: black graphite #070B10, acid lime #D7FF35, muted violet #A99AD9, energetic italic ZAPRUDA COMMUNITY wordmark.
- Reference screens: auth; chat list «СВОИ НА СВЯЗИ»; room «СПОТЫ И ВОДА»; admin dashboard; finance.
- Other application screens must follow the **same** design system; never source styling from earlier generic finance app images.
- No fabricated chat counts, balances or payment status. No enabled OAuth without real setup.

## Mandatory before deployment
1. Implement reference fidelity in all actual screens; package version alone does not implement them.
2. Build and run automated browser checks; inspect 390px screenshots against the exact image.
3. Test auth, chat, admin and RLS using separate staging; staging DB currently incomplete.
4. Provide the owner a live test URL and secure final approval.
5. Only then deploy. Do not merge main, touch production Supabase, or publish unsupported release claims.

Deployment is **NOT COMPLETE**. A version declaration and a PR are not a production release.
