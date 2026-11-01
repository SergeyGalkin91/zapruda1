# Coordinates exposure: STAGING-only validation plan and proposed SQL

**2026-11-01. NOT APPLIED TO ANY DATABASE. NOT A PRODUCTION MIGRATION.**

Production read-only findings:
- `public.fishing_reports` SELECT RLS: `is_public OR auth.uid() = user_id`.
- `anon` and `authenticated` have **table-wide SELECT grants**, so `latitude` and `longitude` are readable on rows permitted by RLS.
- The same roles can SELECT `approximate_latitude` and `approximate_longitude`.
- STAGING `yudtbifopfnjtjanaqrd` has zero public application tables at this checkpoint. The SQL below must **NOT** be run there until the reviewed schema-only baseline has been restored.

## Proposed fix — reviewed migration only, in STAGING

Keep exact fishing marks in an owner-only table (existing `report_private_locations` or another verified restricted schema). Do not populate public `fishing_reports.latitude/longitude` with exact coordinates.

A **table-level SELECT grant overrides an attempted column-only restriction**. Therefore simply revoking column SELECT for `latitude/longitude` is not sufficient. Candidate solution, after checking clients, existing grants, inherited permissions and RLS:

1. Remove the full-table SELECT grant for `anon` and `authenticated` on `public.fishing_reports`.
2. Grant column-level SELECT on the explicit set of legitimate public report columns, excluding `latitude` and `longitude`. Review the actual column list and dependencies first; do not use `SELECT *` in public clients.
3. Preserve existing RLS ownership/publication policies, and confirm report lists, detail pages, photos and moderation access still work.
4. Ensure **no** other role inheritance or `PUBLIC` grant recreates broad access. Admin/server roles requiring exact location must have explicit authorized paths.
5. Add server-side constraints/validation so future report insertion never stores exact points in the broad public-report table. Validate exact coordinates are only ever stored in an RLS-protected owner-only table.

## Read-only before-and-after SQL checks (run once the STAGING schema exists)

```sql
select
  has_table_privilege('anon', 'public.fishing_reports', 'SELECT') as anon_table_select,
  has_table_privilege('authenticated', 'public.fishing_reports', 'SELECT') as member_table_select,
  has_column_privilege('anon', 'public.fishing_reports', 'latitude', 'SELECT') as anon_exact_lat,
  has_column_privilege('anon', 'public.fishing_reports', 'longitude', 'SELECT') as anon_exact_lon,
  has_column_privilege('authenticated', 'public.fishing_reports', 'latitude', 'SELECT') as member_exact_lat,
  has_column_privilege('authenticated', 'public.fishing_reports', 'longitude', 'SELECT') as member_exact_lon,
  has_column_privilege('anon', 'public.fishing_reports', 'approximate_latitude', 'SELECT') as anon_approx_lat,
  has_column_privilege('authenticated', 'public.fishing_reports', 'approximate_longitude', 'SELECT') as member_approx_lon;
```

Pass conditions: both exact latitude/longitude privileges are false for `anon` and `authenticated`; approved approximate fields remain readable according to policy. If column grants are insufficient for current frontend queries, fix client-side projections rather than restoring the broad grant.

## JWT-based integration matrix (STAGING accounts/data only)

| Caller | Expected |
|---|---|
| Unauthenticated (anon) | Can read public report's approved fields and approximate coordinates; cannot read exact coordinates |
| Other signed-in member | Same as anon for another person's public report; no exact coordinates |
| Report owner | Reads owned private marks through authorized private-location API, not exact columns in broad public report projection |
| Admin | Access only via explicitly authorized admin endpoint with independently tested admin checks |
| Any user on a private report | No information exposed except per owner/admin policy |

Test with real anon/member/owner JWTs and synthetic STAGING points, including `select=*`, explicitly requested `latitude`, and embedded relations through the Data API. Verify both successful data access and expected 403/permission failures; test owner-only access to private locations.

## STOP conditions

No production DDL, RLS changes, migration execution, schema bootstrap, or client deployment until reviewed STAGING baseline and real role tests. Do not copy production user coordinates, auth users, secrets, payments or fishing reports to STAGING. Approved visual design from five-screen owner mockup must remain unchanged.
