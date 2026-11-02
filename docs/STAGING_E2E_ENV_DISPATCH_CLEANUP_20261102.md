# STAGING real-JWT E2E — operational handoff, 2026-11-02

## State
- Workflow already exists at `.github/workflows/staging-club-real-jwt-e2e.yml` in draft PR #54, requires protected GitHub environment `staging-e2e`.
- Environment provisioning and workflow dispatch **cannot be completed with currently connected GitHub actions**: no repository environments/secrets management or workflow_dispatch action is exposed. Do not claim a run or invent credentials.
- GitHub manual `workflow_dispatch` typically requires workflow YAML on repository default branch. Since PR #54 is unmerged and **main may not be modified**, this is an additional launch blocker. Do not merge just to trigger tests without approval.
- Node API/JWT runner is not a Playwright browser test, and retains the disposable club membership/message for inspection.
- Need two dedicated STAGING Auth accounts with confirmed email, passwords supplied through GitHub environment secrets, and one disposable owner club named `QA_E2E_STAGING_...`. Never use real users or real payments.

## Protected environment setup (GitHub UI)
1. Repository Settings → Environments → New environment → `staging-e2e`; require reviewer approval, restrict deployments to approved QA branch as appropriate.
2. Environment **variables**: `ZAPRUDA_E2E_STAGING_URL=https://yudtbifopfnjtjanaqrd.supabase.co` and `ZAPRUDA_E2E_CLUB_ID` (exact disposable UUID).
3. Environment **secrets**: `ZAPRUDA_E2E_PUBLISHABLE_KEY` (public key, stored here for consistency), `ZAPRUDA_E2E_OWNER_EMAIL`, `ZAPRUDA_E2E_OWNER_PASSWORD`, `ZAPRUDA_E2E_INVITEE_EMAIL`, `ZAPRUDA_E2E_INVITEE_PASSWORD`.
4. With proper authorization, place dispatch YAML on default branch or use an approved alternate runner with access to STAGING and installed dependencies. Never expose secrets to unreviewed fork PR workflows.
5. Trigger manual run for the reviewed QA branch; preserve GitHub run URL and verify Auth/REST calls, invite, acceptance, private chat, denial checks. Browser Network inspection is separate.

## Cleanup
Run **only** on STAGING using the exact QA fixture ID, in one SQL session:
```sql
BEGIN;
SET LOCAL zapruda.qa_club_id = '<exact-QA-group-uuid>';
-- Execute the DO block from supabase/staging/QA_ONLY_cleanup_real_jwt_fixture.sql
COMMIT;
```
Do not use a normal live club. The cleanup script refuses a group whose name does not begin `QA_E2E_STAGING_`. Verify SELECT count(*) for club, members and messages returns zero afterwards. Do not delete real accounts.

## Release gate
Not complete until a real run ID/result and zero-residue evidence exist. Nothing applied to PROD; main unchanged.
