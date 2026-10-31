-- ZAPRUDA staging schema parity audit (READ ONLY).
-- Run separately on each project. Counts are a diagnostic, NOT proof of schema equivalence.
-- Production snapshot reference: 2026-10-31. Do not apply this as a migration.
WITH counts AS (
 SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS public_tables,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS public_functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS public_policies,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS public_triggers,
  (SELECT count(*) FROM storage.buckets) AS storage_buckets,
  (SELECT count(*) FROM storage.objects) AS stored_objects
)
SELECT *,
       (public_tables=61 AND public_functions=26 AND public_policies=155
        AND public_triggers=16 AND storage_buckets=5) AS counts_match_production_snapshot,
       (stored_objects=0) AS empty_storage_objects
FROM counts;
-- empty_storage_objects=TRUE is REQUIRED on STAGING only.
-- It is NOT expected on PRODUCTION; do not interpret it as a production failure.
-- Counts alone cannot validate columns, definitions, policy expressions, grants,
-- auth hooks, publications, or storage bucket configuration.

-- Privileged routines: authenticated EXECUTE is expected to be FALSE
-- for activate_paid_club(uuid) on hardened STAGING (PR #11).
-- Other functions may intentionally permit EXECUTE with internal admin checks;
-- those must be tested under real non-admin and admin staging JWTs.
SELECT p.oid::regprocedure::text AS signature, p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('activate_paid_club','confirm_club_creation_payment','admin_finance_summary')
ORDER BY signature;

SELECT t.tgname, t.tgenabled,
       t.tgrelid::regclass::text AS attached_table
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='club_creation_requests'
  AND t.tgname='create_paid_club_after_confirmation' AND NOT t.tgisinternal;

-- Confirm actual schema equivalence with a reviewed schema-only dump and
-- separate object-definition diff before enabling staging user tests.
