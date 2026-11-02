# Real two-JWT STAGING club E2E runner (not yet executed)

Created `scripts/e2e-club-two-real-jwt.mjs` for independently authenticated account A (club owner) and B (invitee) using Supabase Auth's `signInWithPassword`; validates owner club, pending invite, acceptance, private message read and anonymous denial.

**Hard safety gate**: refuses any URL except `yudtbifopfnjtjanaqrd.supabase.co`; requires non-secret publishable key. Credentials are passed exclusively as environment variables, not stored in code or GitHub. Requires disposable pre-provisioned STAGING club owned by A and B not already member. The script **leaves fixture changes** for inspection rather than deleting them with privilege escalation. Use only disposable accounts/club; clean up after review.

Required variable names: `ZAPRUDA_E2E_STAGING_URL`, `ZAPRUDA_E2E_PUBLISHABLE_KEY`, `ZAPRUDA_E2E_OWNER_EMAIL`, `ZAPRUDA_E2E_OWNER_PASSWORD`, `ZAPRUDA_E2E_INVITEE_EMAIL`, `ZAPRUDA_E2E_INVITEE_PASSWORD`, `ZAPRUDA_E2E_CLUB_ID`.

Run: `node scripts/e2e-club-two-real-jwt.mjs` from installed repository environment.

Limitations: tests real Auth/REST JWT, **not a browser UI**. Current assistant runtime cannot reach staging Supabase/Netlify hosts, and no authorized test account passwords exist in context. Script has been added but **not executed against live endpoint**, so real JWT E2E is still PENDING. Existing SQL role simulation and GitHub CI do not change that.
