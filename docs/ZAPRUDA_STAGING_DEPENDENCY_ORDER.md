# ZAPRUDA staging reconstruction dependency order (review-only)

This document does NOT constitute a runnable schema dump. The production catalog is readable with Supabase SQL tools, but no complete reviewed DDL has been exported. No changes to either database are authorized by this document.

## Verified source inventory (2026-11-01)
- 61 public tables, 105 foreign keys; zero user-defined public enums.
- 26 public functions, 16 public triggers, 155 public RLS policies, 139 indexes.
- Three public views, one public sequence, one auth trigger, 15 storage policies, five bucket configurations.
- Constraints: 404 total. `information_schema.columns` shows 520 accessible columns; catalog `pg_attribute` reports 496 physical public-table columns. Investigate this mismatch before restoring.

## Dependency-sensitive reconstruction order
1. Inventory extensions, collations, non-public referenced types, generated expressions, PostgreSQL version and service-managed roles. Never overwrite Supabase-managed auth/storage core objects.
2. Create public tables with exact column definitions, defaults, generated/identity settings; keep foreign keys deferred until all referenced relations exist. Sequence ownership/defaults may need a separate pass.
3. Apply primary keys, uniqueness, CHECK constraints and indexes; defer cross-table foreign keys and validate references to managed auth objects independently. Some indexes back constraints: avoid duplicates.
4. Restore functions in dependency order after their referenced relations exist; routines may depend on other routines. Require private source review for SECURITY DEFINER and embedded credentials.
5. Create views and attach all 105 foreign keys after referenced tables/functions are present. Cycles are handled by deferring foreign keys; view/function cycles may need additional staging.
6. Enable correct RLS/FORCE RLS and apply policies after all referenced helper functions and roles exist. Restore grants only after role validation.
7. Restore application triggers and any custom auth trigger separately; do NOT overwrite auth system schema.
8. Restore storage policies and recreate bucket *configurations* via supported staging-only operations; schema-only dumps do not reproduce bucket rows. Do not copy storage.objects or files.
9. Verify Realtime publications, permissions, extension placement, default privileges and DDL fingerprints against production. Require test admin and ordinary-user JWT tests. Apply PR #11 REVOKE only after parity is established.

## Hard gate
Before any DDL, obtain a complete reviewed SQL artifact (or validated equivalent), check target identity twice, and obtain explicit owner authorization to write to staging. The scripts in this PR are read-only discovery and inspection, NOT restore scripts. Do not run `supabase db push` against incomplete conflicting migration history.
