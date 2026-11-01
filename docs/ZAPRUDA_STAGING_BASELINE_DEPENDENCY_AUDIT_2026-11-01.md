# STAGING baseline dependency audit — 2026-11-01

**READ ONLY findings. No SQL deployed.**

## Confirmed via connected Supabase projects

- Production `sonvniuwtvzzyuglscah`: 61 registered migration entries, each has its SQL in `supabase_migrations.schema_migrations.statements`; 61 public application tables.
- STAGING `yudtbifopfnjtjanaqrd`: 0 public application tables, 0 migration entries.
- The registered migrations are **not** a self-contained clean-install baseline.

### Concrete bootstrap blockers

1. The earliest registered migration `20261029190931_report_photos_secure_storage` starts by creating `public.report_photos` with foreign key `references public.fishing_reports(id)`. The referenced table already had to exist **before the earliest registered migration**. Therefore replaying 61 registered migrations into an empty STAGING will fail unless the original baseline is reconstructed.
2. `20261029210120_bootstrap_initial_admin` requires **exactly one verified nonanonymous auth user** and raises an exception otherwise. It must be omitted/reworked for empty staging or performed through an explicitly reviewed isolated test-admin setup. Never run its production bootstrap blindly.
3. Other migrations refer to `auth.users`, storage buckets, functions and earlier tables. Need dependency-ordered catalog inspection including `pg_get_functiondef`, views, constraints, sequences, grants and policies where appropriate.
4. Migration SQL may contain data operations or sensitive literal values; inspect and sanitize before adding any migration to GitHub.

## Safe sequence

1. Build reviewed, portable **schema-only** baseline from production catalog metadata, not from private table rows.
2. Inspect migration SQL from the registry for dependencies, non-schema data writes, privileged functions and identity bootstrap assumptions. Do not export secrets, app data, fishing locations, payment data or auth records.
3. Produce a clean STAGING bootstrap set and inspect it for `SECURITY DEFINER`, public grants, owner-only coordinates, and startup triggers.
4. Execute only reviewed SQL in **STAGING** using the existing connected Supabase tool, followed by schema and RLS inspection. Never run production DDL as part of bootstrap.
5. Create test-only synthetic auth users and synthetic report data; test anon/owner/other/admin API access and Realtime.
6. Stage coordinate-grant remediation, confirm approximate-coordinate read still works and exact coordinates are denied, then review release.

**Gate:** Until a complete baseline and dependency sequence are inspected, do NOT invoke `apply_migration`, `db reset`, or schema-replay commands. Avoid re-requesting CLI login or personal-access tokens; read-only connected metadata queries already work.
