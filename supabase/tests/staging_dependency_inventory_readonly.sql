-- ZAPRUDA: READ-ONLY restoration dependency inventory, NOT an executable restore.
-- Capture reviewed output privately. No user rows, no mutations.
-- Table foreign keys: defer until all 61 tables exist.
SELECT con.conrelid::regclass::text AS child_table,
       con.confrelid::regclass::text AS referenced_table,
       con.conname,pg_get_constraintdef(con.oid,true) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND con.contype='f'
ORDER BY child_table,referenced_table,con.conname;
-- Identity / serial sequences and ownership.
SELECT seq.oid::regclass::text AS sequence_name,
       dep.refobjid::regclass::text AS owned_by_table,att.attname AS owned_by_column,
       dep.deptype
FROM pg_class seq JOIN pg_namespace n ON n.oid=seq.relnamespace
LEFT JOIN pg_depend dep ON dep.objid=seq.oid AND dep.classid='pg_class'::regclass
 AND dep.refclassid='pg_class'::regclass AND dep.deptype IN ('a','i')
LEFT JOIN pg_attribute att ON att.attrelid=dep.refobjid AND att.attnum=dep.refobjsubid
WHERE n.nspname='public' AND seq.relkind='S'
ORDER BY sequence_name;
-- Function dependencies on extensions (do not reproduce managed extensions blindly).
SELECT DISTINCT p.oid::regprocedure::text AS routine,
       e.extname AS extension_name
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_depend d ON d.classid='pg_proc'::regclass AND d.objid=p.oid
JOIN pg_extension e ON e.oid=d.refobjid
WHERE n.nspname='public' ORDER BY routine,extension_name;
-- Owned schema objects for public:
SELECT e.extname,c.relkind,c.oid::regclass::text AS extension_owned_object
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e'
JOIN pg_extension e ON e.oid=d.refobjid WHERE n.nspname='public'
ORDER BY extension_owned_object;
-- Privileges: capture grants separately from DDL and verify staging roles.
SELECT table_schema,table_name,grantee,privilege_type
FROM information_schema.role_table_grants WHERE table_schema='public'
ORDER BY table_name,grantee,privilege_type;
-- Snapshot readiness of source; no data values read.
SELECT (SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='f') AS foreign_keys,
 (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
 WHERE n.nspname='public' AND t.typtype='e') AS public_enums;
