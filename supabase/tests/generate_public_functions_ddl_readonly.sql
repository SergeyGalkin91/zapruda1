-- ZAPRUDA: SELECT-only extraction of function DDL for PRIVATE review.
-- SECURITY DEFINER bodies may contain secrets; do not publish generated output.
-- Not a runnable migration or safe restore package.
SELECT p.oid::regprocedure::text AS signature,
       p.prosecdef AS security_definer,
       pg_get_functiondef(p.oid) AS ddl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f'
ORDER BY signature;
