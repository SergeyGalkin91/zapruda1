# ZAPRUDA COMMUNITY — Unified release candidate v0.6.0-admin-rc.1

This branch is the **single integration point** for app changes and the owner's visual references. GitHub PR #14 targets `main` but remains DRAFT.

## What is included
- Complete application integration branch `integration/p0-admin-beta-rc1-clean` (the base of this design branch).
- Approved owner visual references priority at `docs/ZAPRUDA_OWNER_VISUAL_REFERENCE_v0.6.0-admin-rc.1.md`.
- Shared dark / graphite + lime / lilac design tokens, revised wordmark and chat room visual improvements.
- Existing Supabase integration, unchanged.

## Not ready to publish
- Rendering has NOT been verified against actual uploaded image references at 390px across all routes.
- Admin, finance, auth, chats, and reports need functional and role-specific testing.
- Staging Supabase is empty; no independent data test is yet available.
- No public preview hosting verified. Lovable project remains on its existing deployed version.

## Release gate
1. Green build and mobile screenshot artifact on release candidate HEAD.
2. Visually compare approved owner's images; fix UI until approved.
3. Verify anonymous, ordinary user, and admin permissions on staging; protect production.
4. Owner reviews the final working URL/screenshots.
5. Only then consider merge/deploy with separate approval.

No unapproved payment, schema change, production writes, or app store release.
