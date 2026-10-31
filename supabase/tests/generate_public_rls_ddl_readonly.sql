-- ZAPRUDA: SELECT-only RLS statements for offline review.
-- Policies can reference user-defined helper functions, tables and roles.
WITH table_settings AS (
 SELECT 0 AS stage,c.oid::regclass::text AS object_name,
        CASE WHEN c.relrowsecurity THEN format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;',c.oid::regclass)
             ELSE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY;',c.oid::regclass) END AS ddl
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 UNION ALL
 SELECT 1,c.oid::regclass::text,
        CASE WHEN c.relforcerowsecurity THEN format('ALTER TABLE %s FORCE ROW LEVEL SECURITY;',c.oid::regclass)
             ELSE format('ALTER TABLE %s NO FORCE ROW LEVEL SECURITY;',c.oid::regclass) END
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
), policy_statements AS (
 SELECT 2 AS stage,format('%I.%I.%I',p.schemaname,p.tablename,p.policyname) AS object_name,
        format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
          p.policyname,p.schemaname,p.tablename,p.permissive,p.cmd,
          (SELECT string_agg(CASE WHEN role_name='public' THEN 'PUBLIC' ELSE quote_ident(role_name) END,', ' ORDER BY role_name)
           FROM unnest(p.roles) AS role_name),
          CASE WHEN p.qual IS NOT NULL THEN ' USING ('||p.qual||')' ELSE '' END,
          CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK ('||p.with_check||')' ELSE '' END
        ) AS ddl
 FROM pg_policies p WHERE p.schemaname='public'
)
SELECT stage,object_name,ddl FROM table_settings
UNION ALL SELECT stage,object_name,ddl FROM policy_statements
ORDER BY stage,object_name;
-- Review dependency order and roles before executing any generated SQL.
