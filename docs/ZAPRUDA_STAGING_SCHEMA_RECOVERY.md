# ZAPRUDA STAGING — P0 schema recovery runbook (audit-only)

Design lock: v0.6.0-admin-rc.1. This document does not authorize production writes or merging PRs.

## Verified inventory (2026-10-31)
- Production project: `sonvniuwtvzzyuglscah`; read-only information_schema inventory confirms 61 public base tables, including profiles, fishing_reports, social_threads, social_messages, social_groups, club_creation_requests, zapruda_admins.
- Staging project: `yudtbifopfnjtjanaqrd`; separate project, previously confirmed empty (0 public app tables, 0 migrations).
- Enabled trigger `create_paid_club_after_confirmation` exists on production `club_creation_requests` (tgenabled='O'). The trigger has not been exercised under staging JWTs.
- Production function `activate_paid_club(uuid)` is SECURITY DEFINER and authenticated has EXECUTE. The proposed REVOKE remains only in draft PR #11.
- Production `admin_finance_summary()` and `confirm_club_creation_payment(uuid,text)` are SECURITY DEFINER and have authenticated EXECUTE; server-side admin behavior requires a real non-admin JWT test.
- Grok's migration audit (user-supplied) identified duplicate version prefixes `20261029000000` (2), `20261030000000` (2), `20261108000000` (3), and a draft migration among versioned files. Source files do not reconstruct the full live base schema.

## Critical bootstrap guardrails
1. Obtain a **schema-only** export of the current production database, including public schema, needed auth hooks, functions, triggers, grants, RLS, and storage policies; separately inventory storage bucket configuration. Do not export data, auth users, messages, objects, keys, payment references, or secrets. Review the dump for accidental secrets embedded in functions or configuration before sharing/committing.
2. Do not run all Git migrations on top of a full schema snapshot: many objects already exist. Choose one provenance/ordering strategy for staging, record migration history, and test in isolation.
3. Do not run `bootstrap_initial_admin.sql` blindly. Create disposable A/B/C test accounts after verified schema deployment and assign test admin C deliberately, never via ambiguous one-user bootstrap.
4. After schema parity checks, apply draft PR #11 revoke **only to staging**, verify authenticated cannot call legacy RPC, and test trigger-created paid club exactly once on a synthetic approved request. Use no real payments.
5. Execute JWT A/B/C test matrix for profile ownership, accepted DM and club membership, non-admin RPC denial, admin confirmation and finance authorization; record HTTP statuses and database invariants, never raw JWTs.
6. Do not merge PR #11 or #12 or change production until independent review of results and explicit owner sign-off.

## Next executable stage
Need a reviewed schema-only export. A GitHub migration folder with version collisions is NOT a safe substitute. No production schema/data modified during this audit.
