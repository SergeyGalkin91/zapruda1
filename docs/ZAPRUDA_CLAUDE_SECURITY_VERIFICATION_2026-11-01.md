# ZAPRUDA v0.7.0 — проверка замечаний Claude (2026-11-01)

Scope: **read-only** inspection of production Supabase `sonvniuwtvzzyuglscah` and GitHub. No production SQL applied. Independent audit branch; do not merge automatically. Approved five-screen design is unchanged.

## P0 — precise fishing coordinates (confirmed permission risk)
- `public.fishing_reports` has `latitude`, `longitude`, `approximate_latitude`, `approximate_longitude`.
- `has_column_privilege(..., SELECT)` returned **true** for both `anon` and `authenticated` on **all four** fields.
- SELECT policy `Read visible reports`: `is_public OR auth.uid() = user_id`. Thus a publicly visible report can expose exact latitude/longitude, **if those columns contain values**, through a broad report SELECT.
- This is a permission risk, **not evidence of already exposed sensitive points**; no user coordinate values were fetched in this audit.
- Mitigation needs a tested storage/API design: keep precise points in owner-only `report_private_locations`, return approximate points to public clients via restricted API/projection, inspect current clients and grants. **Do not naively REVOKE two column grants when table-level SELECT is present; test effective permissions and API behavior with separate anon/owner JWTs in STAGING.**
- Do not apply speculative RLS or grants to production before STAGING schema exists.

## P0/P1 — paid club creation (Claude's unconditional duplicate claim not confirmed)
- `activate_paid_club(p_request_id uuid)` is `SECURITY DEFINER`, executable by `authenticated`, checks `auth.uid()`, applicant ownership, status `paid`, payment reference; it first selects `social_groups` by `source_request_id`, and its insert uses `ON CONFLICT (source_request_id)`.
- `create_paid_club_after_confirmation()` fires on transition to `paid`; inserts social group with same `source_request_id` and `ON CONFLICT`, adds membership with `ON CONFLICT DO NOTHING`.
- Hence the two paths overlap but a **duplicate club is not established by function inspection**, given source-request uniqueness and conflict handling. Still verify trigger order, privileges, race conditions and post-payment states in isolated STAGING, and consider eliminating a redundant authenticated RPC in security PR #11.
- `confirm_club_creation_payment` checks `zapruda_admins` for caller. That is server-side admin gating; still needs a real unauthorized JWT test.

## Other findings from Claude that need separate audit
- Verify `guide_booking_inquiries` RLS predicate `g.service_mode = g.service_mode` and safely correct it after checking actual columns and business rules.
- Determine frontend use of `chat_reactions` vs `chat_message_reactions` before any deletion. No table deletion approved.
- Investigate historic .env commits **without revealing any key contents**, and rotate compromised secrets through their owner-controlled dashboard if confirmed.
- Existing app is v0.7.0; approved aesthetic is the owner's five-phone mockup in chat, described in `docs/ZAPRUDA_PROJECT_HANDOFF.md`.

## Safe gates
1. Review schema-only export, storage/auth dependencies and privileges; STAGING `yudtbifopfnjtjanaqrd` previously had zero application tables and migrations.
2. Implement minimal candidate fixes only in dedicated SQL migrations and feature branch; perform JWT role-based tests in isolated STAGING.
3. Validate UI, CI and Docker, solicit review, then separately approve merge and release. No production operations until then.
