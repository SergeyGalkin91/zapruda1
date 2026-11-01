# Claude archive review — selective integration
Date: 2026-11-01
Source: user-provided `zapruda-src-updated.zip` / `CHANGES.md`.
Base: `feat/auth-confirm-profile-onboarding-20261101` (PR #26), NOT main.

## Archive provenance and limitations
The ZIP is an alternative src snapshot, not a validated patch against the current 0.7.0 alpha. Its CHANGES.md says:
- new untyped src/lib/db.ts due to allegedly outdated types
- Shell mojibake fixes
- index.tsx live report author/photo/catches/reactions/comments
- reports.new.tsx catches, photos and mmHg→hPa conversion
- profile.tsx live counters/badges/reports
- chat.tsx realtime and geographic tabs
The snapshot also includes *.backup.tsx, *.fixed-test.tsx and *.before-save.tsx routes; publishing these is outside this review.

## Comparison with current GitHub
- Current report page ALREADY checks pressure input in mmHg range 500–900 and converts to hPa; Claude snapshot rounds to one decimal. **Selected:** adopt rounding only.
- Current reports.new.tsx ALREADY persists catches and handles photos, error/retry states. Do not replace its full implementation with the older Claude page.
- Current chat.tsx has approved ZAPRUDA SPOT and Stage B/C work in separate PRs. Do not replace with Claude chat.tsx.
- Current profile.tsx includes edit/read-only form, staging onboarding and avatar changes in PR #26. Do not replace with Claude profile.
- The untyped db.ts is NOT adopted: prefer generated typed Supabase client; do not silently switch production/STAGING schemas.
- Shell.tsx from archive is NOT adopted: active P0 nav/auth refinements have priority.
- The zip does not include a valid Netlify preview deployment fix.

## Exact code change
Only `src/routes/reports.new.tsx`: round the already-existing conversion `mmHg * 1.33322` to 1 decimal in `pressure_hpa`. No changes to publishing logic, tables or credentials.

## Deployment blocker
PR #26 has successful GitHub checks but **no confirmed Netlify deploy-preview status** at last inspection; `deploy-preview-26--zapruda1.netlify.app` returned Netlify Site not found. GitHub CI is not a Netlify deploy. Need inspect Netlify site Continuous deployment integration and Deploy Previews through the Netlify dashboard or direct provider integration (currently unavailable). Never point STAGING Auth Site URL at a missing deployment. Do not touch production.

## Follow-up acceptance
CI+Docker on this branch; review PR; merge only after approval. Test report pressure conversion with a form value (e.g. 750 mmHg → 999.9 hPa) when deployed on STAGING.
