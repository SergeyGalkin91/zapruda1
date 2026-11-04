# STAGING admin role lookup — applied, 2026-11-04

Target: Supabase STAGING `yudtbifopfnjtjanaqrd` **only**. Production/main/DNS untouched.

The front-end `Shell` checks `public.zapruda_admins` to decide whether to show admin routes, but this table was absent from STAGING. The table is now created through migration `staging_admin_role_lookup_empty_20261104` and is **intentionally empty**. No new administrator or moderator has been assigned. Definition matches production structural metadata: `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` and `created_at timestamptz DEFAULT now()`.

Security: RLS enabled, one owner-read SELECT policy; revoked inherited default API privileges before granting only `authenticated` SELECT on `user_id`. No anon SELECT, no authenticated INSERT or DELETE; no user can self-appoint.

Direct STAGING verification: `authenticated_select=true`, `anon_select=false`, `authenticated_insert=false`, `authenticated_delete=false`, `membership_count=0`, `relrowsecurity=true`, `policy_count=1`. A confirmed-account SQL role simulation read zero admin memberships. Real signed-JWT/browser UI smoke remains outstanding.

Stored SQL in `qa/staging/`, not automatic production migration directory. The migration is ALREADY applied; do not automatically repeat. Admin-management workflows remain a separate gate.

The earlier gear + kit RLS test also passed against existing STAGING state: with synthetic authenticated roles, owner inserted temporary rod/reel/kit and invoked `set_my_primary_gear_set`; owner primary=true, stranger gear read=0, kit read=0, delete=0. All changes rolled back, with 0 gear and kits persisted. Note: direct UPDATE of `is_primary` is intentionally restricted; only server-side RPC is supported.