# Real-JWT club E2E handoff — STAGING only, 2026-11-02

## Execution status
**NOT EXECUTED** here: this assistant's container cannot resolve `deploy-preview-54--zapruda1.netlify.app` or `yudtbifopfnjtjanaqrd.supabase.co` (DNS failure). A successful Netlify deploy and GitHub CI are not evidence of browser-level JWT testing.

## Test script
`node scripts/staging-club-real-jwt-smoke.mjs`

Required environment variables, supplied securely at execution time and **never committed**:
- `STAGING_URL=https://yudtbifopfnjtjanaqrd.supabase.co`
- `STAGING_PUBLISHABLE_KEY`: active public publishable key from STAGING dashboard
- `OWNER_JWT`, `INVITEE_JWT`: two distinct signed-in STAGING users' bearer access tokens
- `QA_CLUB_ID`: an existing **disposable** STAGING club with name prefixed `QA_`, owned by `OWNER_JWT` user, with a free slot, whose invited test user is not already a member

Script checks /auth/v1/user identities, owner's club, invite, pending-user cannot see messages, acceptance, message write and owner's message read. It deliberately refuses non-STAGING endpoint, non-QA club name, and identical user IDs. **It leaves test membership/message in disposable QA club**: clean up using authorized test-environment administration afterward. Club creation requires a pre-existing trusted provisioned and fictitiously paid QA fixture; this test does not create payment or provision a club.

## Browser manual check
From Netlify PR #54 preview in two independent browser profiles: inspect DevTools Network and verify all `/auth/v1/` and `/rest/v1/` traffic targets STAGING, not PROD. Sign in separately; invite B using owner A; B accepts; A and B can read/send club messages. A third independent user must not read messages. Test decline flow and full-club error. Do not paste session JWT into issues, chats, PRs, shell history or screenshots.

## Verified previously
GitHub ZAPRUDA checks, Docker smoke and dedicated preview-isolation source guard passed. SQL role simulations and 15-seat concurrent SQL inserts passed, but neither constitutes real browser JWT E2E.

No PROD or `main` changes.
