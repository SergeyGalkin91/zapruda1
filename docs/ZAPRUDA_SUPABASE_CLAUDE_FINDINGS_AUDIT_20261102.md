# ZAPRUDA — аудит расхождения Supabase, 2026-11-02

Статус: только чтение. Ни одного изменения production или STAGING в ходе проверки.

## Подтверждено
- Production `sonvniuwtvzzyuglscah`: 61 таблица public, 155 RLS policies, 25 SECURITY DEFINER functions, 23 custom triggers.
- STAGING `yudtbifopfnjtjanaqrd`: 5 таблиц public, 13 RLS policies, 2 SECURITY DEFINER functions, 1 custom trigger.
- Production migrations include `security_and_logic_fixes_20261101`, `server_side_achievements_20261101`, `achievements_trophy_streak_favorite_20261101`, `perf_cleanup_indexes_rls_initplan_20261101`. Migration names do NOT identify who executed them. Attribution to Claude is UNVERIFIED.
- Production trigger `limit_club_members_20_trigger` invokes `limit_club_members_20()`, whereas current owner product requirement is 15 members.
- Production `quote_guide_booking` uses `round(p_price*0.1)`, hardcoded 10% commission. No claim yet regarding platform config setting existence or its required schema.
- `activate_paid_club` is SECURITY DEFINER, and function logic requires authenticated caller, paid request, and payment reference; its EXECUTE grants and attack paths still need role-based testing.

## Important limitations
- No verified identity of production migration executor, nor proof of Claude tool permissions. Need provider audit logs and authorization history to attribute.
- No verified complete Auth password protection settings, exposed secrets in Git history, or effective payment flow.
- Do not copy production data or credentials to STAGING. Do not restore 56 missing tables blindly: first establish baseline migrations and dependencies.

## Safe implementation gates
1. Owner reviews production migration/audit log and decides whether any migration must be reverted. Never auto-revert.
2. Export **schema-only** baseline from production using authorized tooling; review privacy/security and store no customer data or secrets.
3. Build idempotent, dependency-ordered STAGING migrations with RLS, GRANT, indexes, triggers, functions and storage policies; apply to STAGING only after review.
4. For clubs, explicitly decide whether the 15-member cap counts pending invitations; write server-side concurrency-safe enforcement and regression tests on STAGING.
5. For guide commission, check existing settings contract and test 10% in server-side quotation, refund, settlement and booking flows before migration.
6. Run genuine separate-JWT integration tests, mobile UI previews and CI. Production stays unchanged until separate release approval.
