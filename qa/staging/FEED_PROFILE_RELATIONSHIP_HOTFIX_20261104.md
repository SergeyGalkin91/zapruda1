# Netlify Deploy Preview #93 feed profile relationship hotfix — 2026-11-04

## Problem and evidence
- Actual preview supplied by owner: https://deploy-preview-93--zapruda1.netlify.app/
- Reported feed error: Supabase PostgREST cannot find relationship `fishing_reports → profiles`.
- Code: `src/routes/index.tsx` uses `.from("fishing_reports").select("...,profiles(username,display_name,avatar_url)")`.
- Read-only production comparison: `fishing_reports_user_id_fkey` references `public.profiles(id)`.
- STAGING before fix: `fishing_reports_user_id_fkey` references `auth.users(id)`; no FK to `public.profiles`. 1 existing report, 1 matched profile, **0 orphan records**.
- STAGING profiles RLS already enabled, `anon` and `authenticated` have **column-scoped SELECT** on `id,username,display_name,avatar_url`; no broad table SELECT required.

## STAGING action already applied
- Supabase project `yudtbifopfnjtjanaqrd` only.
- Migration `staging_feed_report_profile_relationship_20261104` APPLIED successfully.
- Non-destructive additional FK `fishing_reports_user_profile_fkey`: `fishing_reports(user_id)` → `profiles(id)` ON DELETE CASCADE.
- Old FK to `auth.users` deliberately **retained**; no data updates, no changes to RLS, grants, production or main.
- PostgREST schema cache reload via `NOTIFY pgrst, 'reload schema'`.

## Verification
- Fresh SQL reads confirm both FKs exist. 1/1 report still matches a profile; zero removed.
- Live browser/PostgREST HTTP re-test is **not independently confirmed**: current tool network cannot resolve preview/Supabase hostnames. Ask Cloud Browser to reload the existing PR #93 preview and verify the feed query no longer shows PGRST200; test as guest and authenticated user. If other errors occur, collect exact network response.
- Avoid replaying migration or changing unrelated constraints. This was a STAGING-only immediate repair, saved in PR as auditable source; coordinate with Work before integrating to avoid duplicate DDL.
