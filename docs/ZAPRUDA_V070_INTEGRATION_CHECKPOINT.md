# ZAPRUDA COMMUNITY v0.7.0 — integration checkpoint

Recorded: 2026-11-01. Scope: draft PR #14, not a release or production deployment.

## Verified GitHub state
- Repo: `SergeyGalkin91/zapruda1`
- Branch: `design/approved-v060-mobile-implementation`
- Verified application commit: `66a3cf5255456a27a6c8baad868674a4175f305f`
- Both GitHub Actions runs at that commit succeeded: `ZAPRUDA checks` (including test step), `ZAPRUDA Frontend Build` (including mobile smoke checks).
- `package.json` version is `0.7.0`.
- Owner-approved visual lock still applies: `docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md`. This older *design lock identifier* is NOT the app version.
- Do not merge draft PR #14 or deploy to production without owner visual approval and authorized end-to-end tests.

## Profile save behavior — tests and limitation
- Client calls `profiles.update` first, then `angler_preferences.upsert`.
- Unit tests cover success, first-call error, partial failure, thrown request, and retry. CI passed.
- **Not atomic**: a successful first write is not rolled back if the second fails.
- **Not yet verified against authenticated STAGING users**. A real integration test is still mandatory.
- Do not add a `SECURITY DEFINER` profile-save RPC to production as a shortcut; design and test role guards, RLS, ownership and transaction semantics in STAGING first.

## Docker state
- A repository `Dockerfile` already builds a TanStack/Nitro Node server with Bun, and runs it as the non-root `node` user.
- Docker image creation/push and remote deployment are **not** confirmed by GitHub CI. Local Docker availability on the user's Windows host does not establish an image deployment.
- Build requires public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` arguments; only use **STAGING** public values for a staging build. Never put `service_role`, database passwords, personal access tokens, or `.env` secrets in build args, Docker image layers, logs or Git.
- Image tag should include the git SHA to avoid confusion with a published release. Do not point STAGING builds at production inadvertently.
- No production Docker build, registry push or deployment is authorized by this checkpoint.

## Supabase STAGING — verified blocker
- STAGING project: `yudtbifopfnjtjanaqrd`.
- Live check in this work session: **0 public app tables; 0 migrations**.
- Production project: `sonvniuwtvzzyuglscah` — MUST remain untouched.
- No schema-only export/import was performed. Migration files alone are not considered a faithful baseline.
- Before authorized staging setup: obtain reviewed schema-only export; audit grants, triggers, RLS, auth/storage dependencies; apply only to verified staging endpoint. Then test JWT guest/member/admin roles and security draft PR #11.
- No user content, authentication users, media, payment secrets or production keys should be exported.

## Next acceptance gates
1. Owner review of current mobile screens **including authenticated profile/chat/admin**.
2. Restore and validate isolated STAGING schema, without user data.
3. Test profile save with distinct STAGING accounts, normal/partial/network failure and retry.
4. Test admin / non-admin RPC authorization and PR #11 in STAGING only.
5. Re-run CI and obtain owner sign-off before merge or deployment.
