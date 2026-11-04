# ZAPRUDA v0.7.5 — geographic chat STAGING verification (2026-11-04)

## Actual action, not a proposed migration
- Applied migration **`staging_geo_text_chat_rls_20261104`** exclusively to STAGING Supabase **`yudtbifopfnjtjanaqrd`**.
- Production `sonvniuwtvzzyuglscah`, `main`, domain/DNS, Auth records and production photos were not modified.
- Patch deliberately stored under `qa/staging/20261104_geo_text_chat.sql`, **outside** `supabase/migrations/` so it cannot automatically deploy to production.
- Created `public.chat_places`, `public.chat_messages`, `public.chat_message_reactions`, plus the controlled `ensure_chat_place(text,text,text)` RPC. Schema and check/FK/index constraints were compared to production through read-only metadata queries; actual user-generated content was not accessed.
- Seeded only one fixed global geography root and the 10 catalog country names (from `src/lib/geo.ts`): **11 geographical records**. Zero messages, zero reactions. No users, moderators or fabricated posts were created.

## Verifications performed against actual STAGING
| Gate | Observed |
|---|---|
| Three new tables | Exist |
| `relrowsecurity` | True on all three |
| RLS policy counts | places 1; messages 3; reactions 3 |
| Guest direct SELECT on places | Denied (SQLSTATE 42501) |
| Guest INSERT on chat_messages | Table privilege false |
| Guest execute `ensure_chat_place` | Function privilege false |
| Authenticated column SELECT on places/messages | True |
| Authenticated direct INSERT on chat_places | Denied |
| Authenticated execute `ensure_chat_place` | Allowed |
| SQL role + synthetic `request.jwt.claim.sub` catalog read | 11 visible geographies |
| SQL role + synthetic subject `ensure_chat_place('RU')` | Existing country returned successfully |
| Chat messages / reactions | Zero |
| `chat_message_photos` table / `chat-photos` Storage bucket | Both absent — by design until media security accepted |

**Important:** The role-substitution tests above do **not** prove valid signed JWT, real Auth session, or end-to-end chat. They verify SQL permissions and policy behavior only. Do not mark the full chat as accepted until actual account-based/REST/browser tests, Realtime and cleanup pass.

## Deliberate remaining limits and security
- The frontend attempts `chat_message_photos` SELECT for attachments and optional image upload via `chat-photos`. This patch intentionally does **not** create either, to avoid allowing unreviewed originals or EXIF/GPS to leak. Text-only chat can be tested; photo upload remains blocked and must display a controlled failure. A separate sanitized upload / signed read / Storage ACL and cross-role test are required.
- Original production `ensure_chat_place` was SECURITY DEFINER. This STAGING equivalent explicitly checks `auth.uid()`, validates a fixed ISO country allowlist and name characters/lengths, and rate-limits region/city creation to five new places per creator per rolling 24h. It uses `SET search_path = ''`, fixed table references, and explicit **EXECUTE only to authenticated**. Security Advisor now reports an extra `authenticated_security_definer_function_executable` WARN (12 vs 11 existing). This is an **intentional, security-reviewed exception requiring live JWT verification**, not a clean linter.
- For chat messages: all authenticated users can read shared geographic rooms; posting is restricted to the account's `angler_preferences` country/region/city. It is not a private DM system. User can delete own messages only.
- The STAGING schema still lacks other public UI dependencies. This migration does not mean all 22 original missing tables are resolved; original 22 -> 20 after PR #98, now 3 more tables added, **expected 17 missing** only if the original baseline and list still apply; re-inventory needed.
- Public release remains NO-GO. No deployment URL verified and no physical phone login tested.

## Next acceptance checks
1. From a real confirmed STAGING user JWT, load catalog; create own region via RPC; send text; see it from a second real confirmed STAGING account; delete only own message; verify second user cannot delete it.
2. Verify guest read/write denied, and country/region mismatch denies message insert.
3. Verify a chat reaction can be added/removed only by its owner.
4. Verify Realtime updates, error states and rate limits on actual published STAGING frontend.
5. Reconcile photo handling via private bucket, sanitization, signed URLs and safe UI before enabling media.
6. Apply only further reviewed isolated STAGING deltas. Do not backfill production user messages into STAGING.

[Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
