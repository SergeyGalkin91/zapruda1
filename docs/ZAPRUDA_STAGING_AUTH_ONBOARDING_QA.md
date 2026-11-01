# ZAPRUDA STAGING — email confirmation and profile onboarding QA
Updated: 2026-11-01. Applies to STAGING project `yudtbifopfnjtjanaqrd` ONLY.

## Redirect setup (required)
Supabase Dashboard → project ZAPRUDA STAGING → Authentication → URL Configuration.
- Set Site URL to a public staging website, not `localhost:3000` (choose actual stable staging URL).
- Add the exact callback URL for the current PR preview: `https://deploy-preview-26--zapruda1.netlify.app/auth?confirmed=1` only if that deployment exists and points to STAGING.
- To support changing Netlify preview numbers, configure a narrowly scoped redirect pattern under the STAGING project only, based on the Supabase official glob syntax, and review its implications; avoid wildcards on production.
- The signUp code sends `emailRedirectTo: window.location.origin + "/auth?confirmed=1"`. Supabase MUST allow this URL; otherwise it can redirect to Site URL (previously localhost).
- Existing confirmation emails will not be rewritten. After fixing allowed URLs, request a NEW confirmation email using a test account.
- The login link and session cookie must be verified in the same browser. Do not paste access tokens or screenshots of tokens.

## Acceptance test
1. Create a fresh test account using a permitted staging preview address; confirm email.
2. Verify return to `/auth?confirmed=1`, automatic session restoration, then `/profile`.
3. First-time profile with no `angler_preferences` must open in edit mode; provide city, fishing method and other chosen data, save.
4. After save, show readonly profile with persistent `Редактировать` button.
5. Avatar: JPG/PNG/WebP <= 5MB, user-only path, profile avatar URL updated; verify that another account cannot replace the file.
6. Refresh page; verify retained session, profile values and avatar.
7. Confirm unexpected OAuth/password-recovery flows still function and no critical auth console errors.
8. Run CI and verify responsive widths 320/375/390/430 and desktop.

## Findings
- PR #26 CI (ZAPRUDA checks and Docker smoke) succeeded on commit `deccdcb3`.
- STAGING already has an auth account and profiles row, but angler_preferences row not yet created as of prior SQL check.
- Functions `my_fishing_progress` and `my_fishing_specializations_v2` were absent on STAGING. Their missing-function errors are now nonblocking in UI; this is not a substitute for implementing them later.
- STAGING bucket `avatars` and owner-scoped policies were created. Do not run these changes against production without separate review.
- Netlify deployment and end-to-end confirmation flow are NOT independently verified.
- Do not merge PR #26 until the live test succeeds.

## Security
Confirmation URL access tokens are sensitive. Redact them from screenshots and chat; revoke/rotate affected sessions after accidental exposure.
