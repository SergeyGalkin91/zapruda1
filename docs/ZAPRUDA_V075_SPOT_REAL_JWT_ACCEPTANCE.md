# ZAPRUDA v0.7.5 SPOT — protected real-JWT staging acceptance
**Status 2026-11-03:** test infrastructure committed. No live JWT result is asserted until the protected workflow succeeds.

## Read-only real JWT gate
- Source: `scripts/e2e/spot-v075-live.mjs`; runner: `.github/workflows/spot-v075-staging-jwt.yml`.
- Existing GitHub environment: `staging-e2e` with the exact secrets in `docs/V071_STAGING_E2E_RUNBOOK.md`.
- Only STAGING URL is permitted: `https://yudtbifopfnjtjanaqrd.supabase.co`.
- Four distinct, email-confirmed identities must sign in using real password/JWT; no passwords or access tokens in logs.
- Read-only checks: each user's personal catches and notifications, denial of queue/review/evidence to non-moderators, wrong/unknown spot rejection. Optional `ZAPRUDA_SPOT_E2E_UPLOAD_PROBE=true` performs a negative, synthetic-PNG upload against an invalid spot, verifies rejection and unchanged catches; no fake public champion.
- The workflow uses GitHub Environment protection; triggering it does not circumvent required reviewers, configuration or credentials.
- Manual default-branch dispatch may be unavailable. To trigger branch-only, edit `.github/spot-v075-e2e-request.txt` on `release/v0.7.5-spot`; the workflow has branch/path-scoped push trigger.
- If no protected secrets exist, expect a FAIL/BLOCKED run, **not** a successful E2E.
- GitHub connector's fetch_commit_workflow_runs covers pull-request-triggered runs and may not list the push-only protected test. Read actual job logs from Actions before making a live E2E success claim.

## Real first-KING prerequisites
1. **Authorized human moderator**: owner's identity must be independently verified against the correct confirmed STAGING Auth user. Do not guess account IDs or elevate roles based on user metadata, username resemblance, or a public profile. Add SPOT moderator only after authorization, with a narrowly scoped approved request/audit entry.
2. **Permitted public spot**: verify location on the ground or credible official data (bank access, seasonal/method restrictions, map rights, safety, privacy); only then approve an actual SPOT. Do not fabricate approved pins for a passing test.
3. **Real evidence**: one authentic legally caught fish with measurement photo uploaded through the form, independent moderator verifying weight/length/method/territory, no self-review; receive stored title and in-app notification. Photo should be stripped of EXIF and published only with author consent.
4. **E2E**: negative unauthorized paths, two distinct angler JWT sessions and independent moderator, exactly one current KING for ranking key, old champion message; secure photo access, real queue and consent, rollback/revocation and concurrent claims.
5. **Release**: genuine E2E result, #67 GEO P0, safe derivative media pipeline, backups, cross-browser, owner acceptance. No production merge, app store or tag before gates.

The read-only preflight is a prerequisite, **not** equivalent to a live catch upload → human moderation → champion award E2E. No staging data mutation is performed by this document.
