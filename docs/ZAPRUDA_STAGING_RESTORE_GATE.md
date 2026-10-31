# ZAPRUDA staging bootstrap — execution gate (2026-11-01)

## Scope and boundaries
Production: `sonvniuwtvzzyuglscah` — read-only export only.
Staging: `yudtbifopfnjtjanaqrd` — only permitted restoration target after review and owner approval.
Approved UI: `v0.6.0-admin-rc.1`. Never merge to main, deploy, or alter production as part of recovery.

## Verified blocker
There is no production PostgreSQL password or connection URI available to the assistant.
Supabase MCP can read catalog metadata but does not expose `pg_dump` or arbitrary file export.
Frontend `.env` publishable keys are not PostgreSQL credentials.
Do not reset the production DB password, request secrets in chat, or assume a scoped PAT can authenticate as a DB user.
Do not reconstruct a live production schema from incomplete/conflicting Git migrations.

## Official path
Supabase documents CLI backup/restore at:
https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

Once a database owner has arranged authorized read access, produce a **schema-only** export
using a DB URI privately on the executing computer. Prefer the direct connection if
IPv6 works, otherwise the session pooler connection (not transaction pooler).
`supabase db dump --db-url <PRIVATE_PROD_URI> --schema public --file <PRIVATE_OUTSIDE_REPO_PATH>`
uses neither `--data-only` nor `--linked` and does not require CLI account login.

Do not store URI, passwords, raw SQL dumps, auth data, or user records in the repository.
Run `scripts/inspect-schema-dump.ps1` against a local dump and review the actual SQL
manually for hidden secrets in function bodies, roles/grants, privileged operations,
extension dependencies, managed schema objects and unexpected modifications.
A passing scanner result is not enough.

## Restore gate — intentionally not automated
1. Independently validate the **target** connection identity using a live read-only
   `SELECT current_database(), current_user, inet_server_addr()`, plus dashboard
   project-ref confirmation. A substring search in the connection URL alone is NOT
   an adequate identity check.
2. Snapshot staging state; confirm it contains no application tables or real records.
3. Have an engineer review a staged restoration plan for schema, dependencies,
   extensions, grants, functions, policies, auth hooks, storage policies, and
   storage bucket *configuration* (bucket rows are not included in schema-only SQL).
4. Only after explicit owner approval execute a reviewed, **staging-only** transaction
   with ON_ERROR_STOP; do not run `supabase db push` against the incomplete migrations.
5. Use SQL parity tests in `supabase/tests/` plus independent table/column/constraint
   diff. Confirm the existing custom auth triggers and storage buckets are recreated
   without copying production users, payment data, messages, or files.
6. Apply the PR #11 legacy RPC revoke only to staging after full structure is verified,
   then execute A/B/C real-JWT authorization tests.

## Current facts
Production read-only inventory (2026-11-01): 61 public tables, 520 columns,
139 indexes, 26 public functions, 155 public policies, 16 noninternal triggers,
5 buckets. Staging has no public app objects or buckets at inspection time.
Counts are diagnostics only. SQL source/definition comparisons are still needed.

**Status: blocked at authorized production schema export.** No database restoration
or modification has been performed. Do not claim staging is ready for user tests.
