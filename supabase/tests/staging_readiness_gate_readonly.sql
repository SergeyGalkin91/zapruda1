-- ZAPRUDA STAGING readiness gate. READ ONLY.
-- Run against the explicitly selected STAGING project yudtbifopfnjtjanaqrd.
-- A green result is necessary, NOT sufficient; still require schema-definition
-- diff and real JWT A/B/C tests. Never execute this as a migration.
WITH counts AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public') AS columns,
    (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
    (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
    (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
    (SELECT count(*) FROM storage.buckets) AS buckets,
    (SELECT count(*) FROM storage.objects) AS objects
), requirements AS (
  SELECT
    to_regclass('public.profiles') IS NOT NULL AS profiles_exists,
    to_regclass('public.social_messages') IS NOT NULL AS messages_exists,
    to_regclass('public.club_creation_requests') IS NOT NULL AS club_requests_exists,
    to_regclass('public.zapruda_admins') IS NOT NULL AS admins_exists,
    EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='activate_paid_club'
    ) AS legacy_rpc_exists,
    EXISTS (
      SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='club_creation_requests'
        AND t.tgname='create_paid_club_after_confirmation' AND t.tgenabled IN ('O','A')
    ) AS paid_club_trigger_enabled
)
SELECT counts.*,requirements.*,
       (tables=61 AND columns=520 AND indexes=139 AND functions=26
        AND policies=155 AND triggers=16 AND buckets=5
        AND objects=0 AND profiles_exists AND messages_exists
        AND club_requests_exists AND admins_exists
        AND paid_club_trigger_enabled) AS baseline_ready
FROM counts CROSS JOIN requirements;
-- After applying SECURITY REVOKE on staging, independently check:
-- SELECT has_function_privilege('authenticated','public.activate_paid_club(uuid)','EXECUTE');
-- Expected FALSE. Do not invoke the RPC here.
