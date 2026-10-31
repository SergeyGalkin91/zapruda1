-- ZAPRUDA production catalog extraction: READ ONLY. 
-- Execute in production SQL editor (or Supabase read-only connector), then securely
-- store results OUTSIDE GIT. Some function definitions can contain embedded secrets.
-- This is not a pg_dump substitute and cannot recreate full schema by itself.
-- Tables, columns, defaults, types, identities and generated expressions.
SELECT 'column' AS kind,format('%I.%I.%I',n.nspname,c.relname,a.attname) AS object_name,
       format_type(a.atttypid,a.atttypmod) AS sql_type,
       a.attnotnull AS not_null,
       pg_get_expr(d.adbin,d.adrelid) AS default_expression,
       a.attidentity AS identity_mode,a.attgenerated AS generated_mode,
       col.collname AS collation_name
FROM pg_attribute a
JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
LEFT JOIN pg_collation col ON col.oid=a.attcollation AND a.attcollation <> (SELECT oid FROM pg_collation WHERE collname='default' AND collnamespace='pg_catalog'::regnamespace)
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND a.attnum>0 AND NOT a.attisdropped
ORDER BY c.relname,a.attnum;

-- Constraints (includes foreign keys, CHECK and uniqueness).
SELECT format('%I.%I',n.nspname,c.relname) AS table_name,
       con.conname AS constraint_name,con.contype AS constraint_type,
       pg_get_constraintdef(con.oid,true) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' ORDER BY table_name,constraint_name;

-- Indexes: definitions depend on tables, columns, extensions and functions.
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' ORDER BY tablename,indexname;

-- RLS enablement, FORCE RLS and policy expression.
SELECT c.oid::regclass::text AS table_name,c.relrowsecurity,c.relforcerowsecurity,
       p.polname,p.polcmd,p.polpermissive,
       array(SELECT rolname FROM pg_roles WHERE oid=ANY(p.polroles)) AS roles,
       pg_get_expr(p.polqual,p.polrelid) AS using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid=c.oid
WHERE n.nspname='public' AND c.relkind IN ('r','p')
ORDER BY table_name,polname;

-- Functions: review output PRIVATELY before export/sharing. May contain secrets.
SELECT p.oid::regprocedure::text AS function_name,p.prosecdef AS security_definer,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY function_name;

-- Triggers, views and sequences.
SELECT t.tgrelid::regclass::text AS table_name,t.tgname,t.tgenabled,
       pg_get_triggerdef(t.oid,true) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY table_name,t.tgname;
SELECT schemaname,viewname,definition FROM pg_views
WHERE schemaname='public' ORDER BY viewname;
SELECT sequence_schema,sequence_name,data_type,start_value,increment,minimum_value,maximum_value,cycle_option
FROM information_schema.sequences WHERE sequence_schema='public';
-- Managed Auth/Storage: inventory hooks and policies, DO NOT dump system tables.
SELECT n.nspname AS schema_name,c.relname AS table_name,t.tgname,
       pg_get_triggerdef(t.oid,true) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='auth' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;
SELECT policyname,tablename,cmd,roles,qual,with_check
FROM pg_policies WHERE schemaname='storage' ORDER BY tablename,policyname;
SELECT id,name,public,file_size_limit,allowed_mime_types
FROM storage.buckets ORDER BY id; -- bucket configurations only; no file objects
