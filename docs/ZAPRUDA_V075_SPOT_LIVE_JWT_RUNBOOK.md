# v0.7.5 SPOT — protected real-JWT STAGING E2E setup

**Status: PREPARED, NOT RUN.** No passwords, JWTs, service-role keys or credentials belong in source, PR comments or chat.
**Target:** STAGING `https://yudtbifopfnjtjanaqrd.supabase.co` only; production is excluded.

## Confirmed live dependencies
Current STAGING investigation: 10 confirmed Auth accounts, zero dedicated SPOT moderators, zero approved public SPOTs, zero real champion records. Four confirmed accounts in the database do NOT prove four known password-bearing QA identities exist.

### 1. Protected GitHub Environment
In repo Settings → Environments → `staging-e2e`, configure protection/authorized reviewers and the nine existing v0.7.1 secrets:
- `ZAPRUDA_E2E_PUBLISHABLE_KEY` (STAGING key only)
- `ZAPRUDA_E2E_OWNER_EMAIL` / `ZAPRUDA_E2E_OWNER_PASSWORD`
- `ZAPRUDA_E2E_SEATED_EMAIL` / `ZAPRUDA_E2E_SEATED_PASSWORD`
- `ZAPRUDA_E2E_RACER_A_EMAIL` / `ZAPRUDA_E2E_RACER_A_PASSWORD`
- `ZAPRUDA_E2E_RACER_B_EMAIL` / `ZAPRUDA_E2E_RACER_B_PASSWORD`

Environment variables:
- `ZAPRUDA_E2E_STAGING_URL=https://yudtbifopfnjtjanaqrd.supabase.co`
- `ZAPRUDA_SPOT_E2E_UPLOAD_PROBE=true` to enable the OPTIONAL negative image-byte upload: valid synthetic PNG, intentionally unapproved random spot, server must reject, no catch created. **Never treated as a real fish photo or proof**.
- `ZAPRUDA_SPOT_E2E_REQUIRE_MODERATOR=true` **only after** owner approves an exact, existing, confirmed account identity and it is appointed in `zc_spot_internal.moderators`. Then the test also asserts a reviewed public STREET/UL SPOT exists.

## 2. Authorization and legal location approval — explicit human gates
- Owner chooses the exact E2E OWNER Auth account (email/UID) and explicitly approves granting **STAGING-only SPOT moderator** privileges. Verify one matching confirmed `auth.users` identity, log the authorization decision and time; grant only this UID to `zc_spot_internal.moderators`. Do not infer the role from account name or a guessed email, do not appoint all confirmed users.
- A pilot SPOT needs verified coordinates, public shoreline access, permitted fishing methods/season, safety and mapped-data rights. A geographic candidate does **not** become `state='approved'` simply because it exists in research notes. Only after manual approval update `zc_public_spots`, with `reviewed_at`, disciplines and documented provenance.
- Never expose paid/private fishing points, users' exact catch GPS or unstripped photo EXIF in the public catalog.

## 3. Start the protected JWT job
The workflow `.github/workflows/spot-v075-staging-jwt.yml` runs on **only** a push changing `.github/spot-v075-e2e-request.txt` on `release/v0.7.5-spot`. Edit the request marker (no secrets) after configuring the environment. Do not merge the workflow into `main` just to activate it. Record the job URL and exact SHA in PR #85.

The runner `scripts/e2e/spot-v075-live.mjs`:
1. Rejects any non-STAGING URL / missing protected configuration.
2. Signs in four distinct **email-confirmed** Auth users with real passwords and JWTs.
3. Verifies queue, review and evidence requests are forbidden to the three ordinary users.
4. Checks the signed caller can retrieve only own catches/inbox through the existing Edge gateway.
5. Optionally attempts a synthetic multipart upload against an invalid/unapproved spot, checks rejection and no saved catch.
6. Optionally checks the authorized E2E OWNER can access the moderator queue and that an approved public STREET/UL SPOT exists.

**Read-only preflight PASS ≠ full title E2E PASS.** The opt-in negative upload touches private STAGING Storage temporarily and expects the Edge backend to remove it; it never awards a KING.

## 4. Positive pilot — NOT automated or completed
To validate the actual `submit → proof → independent moderation → KING → notifications` journey, the owner must supply or approve real QA fish photos; two distinct confirmed accounts must submit to a lawfully reviewed spot; the separate appointed moderator must check species, weight, method, gear and location; subscribers must verify in-app inbox events. Do not approve a synthetic fish image as real evidence. Before testing, approve a narrow cleanup/rollback plan that preserves the evidence and removes only known QA entities after review.

**Release blockers:** signed positive-JWT browser/integration proof, two-session concurrent record race, EXIF-safe consented public photo pipeline, authorized human roles, geographically legal public SPOT, title revocation/recompute, push (if shipping push), GEO P0 #67 and production change review.

Do not mark v0.7.5 released or publish a first legitimate KING until these conditions pass.
