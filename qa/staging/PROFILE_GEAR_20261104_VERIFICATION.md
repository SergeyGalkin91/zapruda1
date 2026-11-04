# ZAPRUDA v0.7.5 — profile gear staging verification (2026-11-04)

**Applied to** Supabase STAGING `yudtbifopfnjtjanaqrd` only, migration `staging_profile_gear_dependencies_20261104`. Production `sonvniuwtvzzyuglscah`, `main`, Auth users, DNS and published websites unchanged.

## Applied
- `public.angler_gear`, `public.angler_gear_sets` restored from read-only production schema metadata with defaults, FKs to profile and same-user gear, validated types, column checks, supporting indexes, and single primary-set unique index.
- 8 owner-only RLS policies in total (4 on each).
- All table privileges revoked from `PUBLIC`, `anon`, `authenticated` before granting CRUD to `authenticated` under RLS.
- Both tables contain **0 rows**. No actual user gear copied and no accounts or simulated profile entries persisted.
- `anon` SELECT denied at SQLSTATE `42501`, `anon` INSERT denied by privileges; authenticated role can select only under `auth.uid()` ownership. Synthetic role+claim selects empty result. This is not real-JWT validation.
- Advisor rerun shows no missing-policy notice on these tables. Existing unrelated advisories: 11 RLS no-policy (including closed internal objects), 12 authenticated SECURITY DEFINER warnings (including prior intentional `ensure_chat_place`) and 1 leaked password protection warning.
- Original missing-client-tables list recount using 22 exact names: **7 now present, 15 still missing**. This incorporates PR #98 (catches/comments), PR #99 (chat_places/messages/reactions), this patch (gear/sets).

## Unproven / blocked
- Real owner vs stranger signed JWT reads/writes and cross-account rod/reel/line swaps are not yet executed. These require genuine confirmed accounts and disposable private fixtures, not simulated `SET ROLE`.
- Profile additionally invokes `my_fishing_progress()` and `my_fishing_specializations_v2()`, **both absent** in STAGING. They must be inventoried independently before declaring the full profile feature operational.
- Mobile login/logout and profile navigation remain unverified because there is no verified deployed STAGING URL.
- Do not mark premium, paid services, chat photos or other missing tables working.

## Follow-up E2E
1. Two confirmed staging users A and B; create private rod/reel for A, verify B cannot read or update it or link to it in a gear set.
2. Ensure owner A can create/edit/delete gear; wrong gear types and cross-user links rejected by RLS; unauthorized and anonymous credentials denied.
3. Confirm a primary gear set can be created only through allowed update workflow and the unique partial index prevents two primary sets per owner.
4. Empty-profile display, auth signout clearing profile and gear cache, and refresh / same-user session behavior via hosted STAGING frontend.
5. Clean up all test entries belonging to the test users and report exact deploy ID, SHA and screenshots.

**No production data was accessed beyond schema metadata.**
