-- ZAPRUDA STAGING read-only parity gate
-- Execute separately against production and staging via an authorized SQL editor.
-- No DDL, DML, user rows, secrets, or project connections.
WITH counts AS (
 SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS public_tables,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS public_functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS public_policies,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS public_triggers,
  (SELECT count(*) FROM storage.buckets) AS storage_buckets,
  (SELECT count(*) FROM storage.objects) AS stored_objects
)
SELECT *, (public_tables=61 AND public_functions=26 AND public_policies=155 AND public_triggers=16 AND storage_buckets=5) AS schema_counts_match_2026_10_31,
       (stored_objects=0) AS no_storage_files
FROM counts;

-- Verify trigger definition and permissions without executing the RPC.
SELECT p.proname, p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('activate_paid_club','confirm_club_creation_payment','admin_finance_summary')
ORDER BY p.proname;

SELECT t.tgname, t.tgenabled
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='club_creation_requests'
  AND t.tgname='create_paid_club_after_confirmation' AND NOT t.tgisinternal;
