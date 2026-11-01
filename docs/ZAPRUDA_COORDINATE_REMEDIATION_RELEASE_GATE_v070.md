# ZAPRUDA v0.7.0 — coordinate disclosure remediation gate

**Status 2026-11-01: DRAFT / NOT DEPLOYED.** Production and main must not be changed without an actual staging rehearsal.

## Verified facts (read-only Supabase connector)

- Production `sonvniuwtvzzyuglscah`: 61 public application tables; 61 migration records.
- STAGING `yudtbifopfnjtjanaqrd`: **0** public application tables and **0** migration records.
- `public.fishing_reports` has `latitude`, `longitude`, `approximate_latitude`, `approximate_longitude`, and `is_public`; RLS enabled.
- `public.report_private_locations` has `report_id`, `user_id`, `latitude`, `longitude`; RLS enabled.
- Earlier grant/policy audit found publicly readable precise coordinates on eligible report rows. RLS on its own does not protect individual columns.

## Migration design (review before running)

1. Inspect actual production RLS, grants, constraints, triggers, functions, views, clients, and whether any existing records hold precise coordinates in `fishing_reports`; never export user coordinates.
2. Restore reviewed, **schema-only**, dependency-complete baseline in STAGING first. Production migration registry may not equal full portable SQL. Recreate only synthetic STAGING test accounts/data.
3. Keep public report listing limited to explicitly enumerated fields. **Revoke table-wide SELECT** for both `anon` and `authenticated` and replace it with selective column grants that exclude `latitude` and `longitude`; preserve SELECT for `id`, `user_id`, `title`, `body`, `location_name`, `approximate_latitude`, `approximate_longitude`, `water_type`, `weather_summary`, `pressure_hpa`, `air_temperature_c`, `wind_speed_ms`, `wind_direction`, `is_public`, `created_at`, `fishing_method`, subject to an explicit use-case review.
4. Keep owner-only exact coordinates in `report_private_locations` with owner checks for SELECT/INSERT/UPDATE/DELETE; any privileged admin access must be separately authorized.
5. Add server-side guards prohibiting precise values in broadly shared report columns for new writes; plan migration of existing precise coordinates only through reviewed, privacy-preserving, owner-mapped migration in STAGING with **synthetic fixtures**.
6. Check dependent `SECURITY DEFINER` functions and views; views are security-definer by default unless `security_invoker=true` on supported PostgreSQL.
7. Apply only to STAGING after the baseline exists and verify API with anon JWT, owner JWT, other-user JWT, and admin role. Confirm denial of explicit `latitude`, `longitude`, and `select=*`, including embedded relations. Ensure public approximate data, owner private locations, and normal report list still work.
8. Only after passing CI, manual security review, and explicit release approval consider production rollout. Do not wire migrations to a push on `main` yet.

## Read-only gate: privileges and table RLS

```sql
select c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', 'public.fishing_reports', 'SELECT') as anon_table_select,
  has_table_privilege('authenticated', 'public.fishing_reports', 'SELECT') as authenticated_table_select,
  has_column_privilege('anon', 'public.fishing_reports', 'latitude', 'SELECT') as anon_exact_lat_select,
  has_column_privilege('anon', 'public.fishing_reports', 'longitude', 'SELECT') as anon_exact_lon_select,
  has_column_privilege('authenticated', 'public.fishing_reports', 'latitude', 'SELECT') as authenticated_exact_lat_select,
  has_column_privilege('authenticated', 'public.fishing_reports', 'longitude', 'SELECT') as authenticated_exact_lon_select
from pg_class c where c.oid='public.fishing_reports'::regclass;
```

**Release acceptance:** `anon_exact_lat_select`, `anon_exact_lon_select`, `authenticated_exact_lat_select`, and `authenticated_exact_lon_select` are all `false`; view and RPC checks also pass. Owner-only exact coordinates remain available solely from the private location path.

## Candidate STAGING-only SQL (not safe to blindly apply)

This is a **draft** for the table privilege part, not an executable production migration. Validate dependent functions, role inheritance, effective privileges and `SELECT *` clients before applying in an isolated STAGING transaction.

```sql
revoke select on table public.fishing_reports from anon, authenticated;
grant select (
  id, user_id, title, body, location_name, approximate_latitude,
  approximate_longitude, water_type, weather_summary, pressure_hpa,
  air_temperature_c, wind_speed_ms, wind_direction, is_public,
  created_at, fishing_method
) on public.fishing_reports to anon, authenticated;
```

Do not infer column privacy from RLS alone; verify with real user tokens through REST Data API and ensure privilege inheritance does not effectively grant access through another role. Even selective grants may be insufficient if exact points are copied to other publicly readable objects.

## Current blocker

STAGING has zero application tables. There is no meaningful real-user integration test or safe schema migration to execute until the reviewed baseline exists. No new CLI login or personal access token should be required merely to repeat read-only inspections through the already connected Supabase integration.
