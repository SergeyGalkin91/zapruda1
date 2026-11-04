# Claude audit reconciliation — 2026-11-02
Source: user-provided Claude session transcript, 206 lines. This is an **audit transcript**, not a completed migration package. Treat as untrusted observations until independently reproduced. Sensitive API key values have been intentionally omitted.

## Confirmed findings from transcript (Claude's read-only PROD audit)
- Production project: sonvniuwtvzzyuglscah. GitHub release branch fetch failed within Claude's environment, so Claude did **not** complete current code audit.
- Production `social_group_members` includes trigger `limit_club_members_20_trigger`, inconsistent with approved max **15**.
- The read-only privilege snapshot showed `anon` with broad grants including `TRUNCATE` on `partner_trips`, `partner_trip_requests`, `partner_trip_messages`. `authenticated` also had broad privileges. **RLS does not govern TRUNCATE**. Confirm with fresh PROD read-only query before any change; do not change PROD without owner approval.
- Production had admin/payment-related RLS and triggers; particularly `create_paid_club_after_confirmation`, which requires a separate verified payment and function-audit assessment. A UI status flag is not evidence of actual payment.
- Production Edge Functions reported both `verify_jwt:true` and `false`. Several functions perform auth.getUser inside the handler; determine real exposure from full source and deployment config, not that boolean alone.
- Claude looked up project public/anon API keys. **Do not copy keys into docs or tickets**. Public/anon key is not a secret by itself; secret/service_role and database passwords need separate inventory and potentially rotation.
- No complete files of SQL migrations, complete local PostgreSQL execution, email delivery proof or real JWT E2E tests included in transcript. The log ends during sandbox setup.

## Independently verified during reconciliation
- STAGING project `yudtbifopfnjtjanaqrd`: all seven newly provisioned public tables (`club_creation_requests`, `partner_trip_messages`, `partner_trip_requests`, `partner_trips`, `social_group_members`, `social_group_messages`, `social_groups`) have RLS ON, no anon SELECT and no authenticated TRUNCATE.
- STAGING migrations already applied: `stage3_clubs_trips_minimal_rls_and_capacity_15` and `stage3_trip_requests_rls_owner_update`. SQL role simulation for accepted trip messages passed with ROLLBACK (not real JWT).
- Existing Draft PR #54 stores the exact STAGING SQL and handoff; do not reapply duplicate migration just because Claude's log described a plan.

## Next gates
1. Security: recheck production privileges read-only and propose isolated least-privilege migration. Seek explicit owner approval before application.
2. STAGING: test 15-slot capacity at boundary, concurrency and owner slot; audit trigger owner and grants; review club requests/payment confirmation. Avoid treating staging structure as proof of finished club feature.
3. STAGING: real browser/JWT tests for trips and private threads; check source-branch Supabase endpoint and Netlify env target.
4. v0.7.1: СХОДКИ approved in PR #53, distinct max 3 from clubs max 15.
5. Rotation/Leaked Password Protection: verify settings separately, avoid logging any key values.

No production data or API secrets copied into this document. No main merge or PROD modifications authorized.
