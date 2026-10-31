-- ZAPRUDA: read-only generation of constraint DDL for OFFLINE review.
-- Run against PRODUCTION as SELECT; NEVER automatically execute output.
-- Foreign keys must come after all referenced tables and unique/PK constraints.
SELECT CASE WHEN con.contype='f' THEN 'foreign_key'
            WHEN con.contype='p' THEN 'primary_key'
            WHEN con.contype='u' THEN 'unique'
            WHEN con.contype='c' THEN 'check'
            WHEN con.contype='x' THEN 'exclusion'
            ELSE 'other' END AS phase,
       con.conrelid::regclass::text AS table_name,
       con.conname AS constraint_name,
       format('ALTER TABLE ONLY %s ADD CONSTRAINT %I %s;',
              con.conrelid::regclass,con.conname,pg_get_constraintdef(con.oid,true)) AS ddl
FROM pg_constraint con
JOIN pg_class c ON c.oid=con.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND con.contype IN ('p','u','c','f','x')
ORDER BY CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2
 WHEN 'c' THEN 3 WHEN 'x' THEN 4 WHEN 'f' THEN 5 ELSE 6 END,
 table_name,constraint_name;
-- IMPORTANT: ALTER TABLE ONLY might not be appropriate for partitions/inheritance;
-- unique/primary constraints can own indexes; avoid creating those indexes twice.
-- Not a complete schema restore (ownership, grants, extensions, sequences, etc.).
