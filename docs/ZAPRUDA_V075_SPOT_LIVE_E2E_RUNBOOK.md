# v0.7.5 SPOT — real JWT pilot acceptance (STAGING only)
**03 Nov 2026. Owner approval and human proof required. Not a production release.**

## Current verified prerequisites
- STAGING project: `yudtbifopfnjtjanaqrd`; currently 10 confirmed Auth accounts, **0 authorized SPOT moderators, 0 approved SPOTs**. No real champions.
- Backend: `zapruda-spot-records`, JWT verification on, submission/review/inbox/queue accessible only through existing server-side permission checks.
- Existing test runner: `scripts/e2e/spot-v075-live.mjs`. Does real signed JWT sign-in, checks four distinct identities, no unauthorized queue/review/evidence, own catch/inbox, and optional negative image upload. It does **not** create a verified fish or constitute complete catch E2E.
- A strict readiness setting `ZAPRUDA_SPOT_E2E_REQUIRE_MODERATOR=true` requires the designated OWNER test identity to have SPOT moderator access **and** at least one legally reviewed public STREET/UL spot.

## Prerequisite 1 — designate an actual moderator; do not pick randomly
Owner specifies **the exact email of a verified STAGING tester** (not a production user). For the current four existing E2E roles this should be the `OWNER` test account, distinct from `SEATED`, `RACER_A` and `RACER_B`.
- In a **privileged STAGING console session**, verify one unique Auth user, email confirmed, and team authorization before running a scoped `INSERT INTO zc_spot_internal.moderators(user_id)` for that exact identity. Never use profile display name or untrusted JWT user_metadata to grant privileges.
- Record the reviewer identity, authorization, date, reason, and later removal. Grant no production permission.
- When the testing is complete, remove ONLY the specific temporary role after confirming it is not needed for active moderation. Never grant a role simply because 10 confirmed users exist.

## Prerequisite 2 — verify a real public SPOT
Curate one city STREET/UL water location; verify public access, lawful angling methods, season restrictions, location source rights, safety and map accuracy. The reviewer must explicitly approve it with `reviewed_at`. **Candidate is not approved**; never seed a fictional verified spot or reveal someone's private point.
- A STAGING-only pilot spot must have `state='approved'`, suitable `disciplines`, and legal review evidence.
- A spot may be tested without revealing private catch coordinates; listing can show only vetted public map geometry.

## Prerequisite 3 — protected credentials (GitHub)
Use **Settings → Environments → staging-e2e → Environment secrets**. Existing v0.7.1 names reused by the runner:
- `ZAPRUDA_E2E_PUBLISHABLE_KEY`
- `ZAPRUDA_E2E_OWNER_EMAIL`, `ZAPRUDA_E2E_OWNER_PASSWORD`
- `ZAPRUDA_E2E_SEATED_EMAIL`, `ZAPRUDA_E2E_SEATED_PASSWORD`
- `ZAPRUDA_E2E_RACER_A_EMAIL`, `ZAPRUDA_E2E_RACER_A_PASSWORD`
- `ZAPRUDA_E2E_RACER_B_EMAIL`, `ZAPRUDA_E2E_RACER_B_PASSWORD`
Set environment variable `ZAPRUDA_E2E_STAGING_URL=https://yudtbifopfnjtjanaqrd.supabase.co`, and protected `ZAPRUDA_SPOT_E2E_REQUIRE_MODERATOR=true`.
Never put passwords, JWTs, service role keys or raw evidence photographs into GitHub source, PR comments or chat.

## Execution stages with honest success criteria
1. **Read-only real-JWT preflight:** Run `node scripts/e2e/spot-v075-live.mjs` inside the protected STAGING environment. Four distinct signed Auth users, email confirmation, queue/review/evidence role isolation, own inbox, authorized reviewer and a reviewed STREET/UL spot must pass. Log run URL, SHA and PASS/FAIL; never claim live E2E if credentials unavailable.
2. **Upload:** With first angler (RACER_A) signed in to STAGING preview, submit one real legal catch with a genuine photograph/measurement through the existing interface. Confirm pending state and private Storage bytes, not just metadata. Confirm nonmoderators can't read it.
3. **Independent human review:** Authorized OWNER moderator views signed evidence, verifies fish/weight/gear/locale/legal compliance, approves or rejects on documented evidence; no approving self-submissions. Confirm transactionally updated KING/LENGTH or UL records, audit/history, and inbox delivery to correct subscribers.
4. **Challenger:** RACER_B submits a second real verified fish in the *same ranking key*; moderator evaluates. Higher verified score dethrones old holder once, equal/slower/invalid cases never mis-award. Confirm actual previous champion receives notice.
5. **Security and recoverability:** deny candidate/private spot, forbidden reviewer, guessed catch ID, wrong league, private Storage/listing, repeated review, modified rank, EXIF/GPS leakage, 2-session concurrent promotion, reversal/revocation and in-app notification duplicates. Unimplemented revocation/concurrent-push cases stay red.
6. **Cleanup:** Preserve evidence IDs/logs in secured environment, then delete only identified test records/media through approved operator process. Do not delete real records or orphan media. Recheck no synthetic champion remains after test.

## Current verdict
- Database role-simulation/rollback and repo quality tests have passed previously, but **are not live HTTP/JWT acceptance**.
- Without the exact authorized moderator account, real approved spot, protected credentials and human-verified catch media, **first real KING remains BLOCKED**. Production release remains a draft under PR #85; do not bump package.json or merge to main.
