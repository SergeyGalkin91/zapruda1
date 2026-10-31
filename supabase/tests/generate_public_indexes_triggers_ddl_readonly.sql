-- ZAPRUDA: extract index and trigger DDL as read-only result rows.
-- Skip indexes backing primary/unique/exclusion constraints because
-- ALTER TABLE ... ADD CONSTRAINT recreates them; verify before applying.
SELECT 'index' AS object_type,format('%I.%I',i.schemaname,i.indexname) AS object_name,
       i.indexdef||';' AS ddl,
       CASE WHEN con.oid IS NOT NULL THEN 'CONSTRAINT-BACKED: DO NOT RECREATE SEPARATELY'
            ELSE 'REVIEW INDEX DEPENDENCIES' END AS warning
FROM pg_indexes i
JOIN pg_class idx ON idx.oid=to_regclass(format('%I.%I',i.schemaname,i.indexname))
LEFT JOIN pg_constraint con ON con.conindid=idx.oid
WHERE i.schemaname='public'
UNION ALL
SELECT 'trigger',format('%I.%I.%I',n.nspname,c.relname,t.tgname),
       pg_get_triggerdef(t.oid,true)||';',
       CASE WHEN t.tgenabled<>'O' THEN 'NONDEFAULT TRIGGER ENABLEMENT REQUIRES SEPARATE DDL'
            ELSE 'REQUIRES TRIGGER FUNCTION AND TABLE' END
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
ORDER BY object_type,object_name;
-- Existing trigger enablement state MUST be restored separately.
