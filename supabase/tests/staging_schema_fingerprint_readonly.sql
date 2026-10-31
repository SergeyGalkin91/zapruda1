-- ZAPRUDA: read-only schema fingerprint. Run independently in PROD and STAGING.
-- Compare object_name + definition_md5 row-by-row. No user rows or secrets returned.
-- NOT an export or restoration. Do NOT run as a migration.
WITH objects AS (
 SELECT 'column' AS object_type,
        c.table_schema||'.'||c.table_name||'.'||c.column_name AS object_name,
        concat_ws('|', c.ordinal_position,c.data_type,c.udt_schema,c.udt_name,
                  c.is_nullable,c.column_default,c.character_maximum_length,
                  c.numeric_precision,c.numeric_scale,c.identity_generation) AS definition
 FROM information_schema.columns c WHERE c.table_schema='public'
 UNION ALL
 SELECT 'function', p.oid::regprocedure::text, pg_get_functiondef(p.oid)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 UNION ALL
 SELECT 'policy', schemaname||'.'||tablename||'.'||policyname,
        concat_ws('|',cmd,permissive,roles::text,qual,with_check)
 FROM pg_policies WHERE schemaname='public'
 UNION ALL
 SELECT 'trigger', n.nspname||'.'||c.relname||'.'||t.tgname, pg_get_triggerdef(t.oid,true)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL
 SELECT 'index', schemaname||'.'||indexname, indexdef FROM pg_indexes WHERE schemaname='public'
 UNION ALL
 SELECT 'table_rls', n.nspname||'.'||c.relname,
        concat(c.relrowsecurity,'|',c.relforcerowsecurity)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
)
SELECT object_type,object_name,md5(definition) AS definition_md5
FROM objects ORDER BY object_type,object_name;
