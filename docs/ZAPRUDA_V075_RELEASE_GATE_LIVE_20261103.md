# ZAPRUDA COMMUNITY v0.7.5 SPOT — audited release blockers (2026-11-03)

**Release decision: NO-GO.** This is the latest observed verification state, not a claim that all existing PRs are merged or deployed. Production and `main` must remain unchanged pending a separate explicit release decision.

## Proven checks (exact scope)

- **v0.7.1 competitions real JWT / last seat:** PASS [Actions 41669574462](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41669574462). Four signed staging accounts.
- **v0.7.1 meetups real JWT / private access / concurrent seat:** PASS [Actions 41669574195](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41669574195).
- **OpenWeather live STAGING**: PASS real weather, input, JWT and coordinate-redaction steps of [Actions 41669574476 attempt 3](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41669574476). **Entire workflow FAIL** at xAI; do not report whole workflow PASS.
- **v0.7.5 code checks, appearance, Docker, mobile smoke:** PASS on SPOT head `45ade0b0079237cbbf753677c2e0f8bca731eb4d` (runs 41669608556, 41669608772, 41669608497, 41669608956).
- **Independent-from-Lovable Vite wrapper trial:** [draft PR #87](https://github.com/SergeyGalkin91/zapruda1/pull/87): quality and appearance CI PASS on `cd6fe6c717518e2173bfebaf30fa87b64c1cb096`. The Lovable package and lockfile still remain: not fully independent.
- **Report photo EXIF/privacy fix:** [draft PR #86](https://github.com/SergeyGalkin91/zapruda1/pull/86): original photo never used in the proposed public derivative, synthetic tests and CI PASS. Not merged; live user-JWT upload/Storage access and legacy photo backfill still not proven.

## Blocking P0 items (not silently waived)

| # | Blocker | Evidence | Required proof before marking resolved |
| --- | --- | --- | --- |
| 1 | **xAI/Grok live advice** | 41669574476 attempt 3: xAI POST returned 502 to app; STAGING advice journal recorded upstream HTTP 400 classified `XAI_INVALID_API_KEY`. OpenWeather PASS. | Verify xAI account/key scopes, model access, API request and billing with **server-side** read-only preflight; live signed-JWT advice returns 200, cached second request returns same answer without double charge. [draft PR #89](https://github.com/SergeyGalkin91/zapruda1/pull/89) adds STAGING-only provider preflight, not deployed yet. |
| 2 | **SPOT real JWT preflight runner** | [Actions 41669592206](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41669592206) attempts 1–2 FAIL; jobs have **no executed step entries**, GitHub job logs unavailable. Root cause NOT confirmed as application code. | Obtain GitHub workflow/job annotation or platform failure reason; check deployment branch rules for `release/v0.7.5-spot` and Actions runner access. Alternate protected runner [41704298830](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41704298830) also failed in one second with empty `steps=[]` (issue [#90](https://github.com/SergeyGalkin91/zapruda1/issues/90)). Then start a protected runner; pass all four signed accounts and denied-authorization paths. Do not repeat useless retries without diagnostics. |
| 3 | **Real SPOT acceptance** | [draft PR #85](https://github.com/SergeyGalkin91/zapruda1/pull/85): SQL emulated JWT/role rollback fixture PASS; no approved public SPOT or authorized human moderator. | Explicit identity/role approval, legally reviewed location, authentic non-synthetic fish evidence, signed multipart upload, independent human moderation, KING election + role-scoped notification, concurrent/revocation cases. Never forge a catch or silently elevate a moderator. |
| 4 | **Exact GPS / REST privacy** | [security issue #67](https://github.com/SergeyGalkin91/zapruda1/issues/67): STAGING/PROD protection drift, legacy exact-GPS columns with SELECT permissions, pending private-coordinate migrations. | Align STAGING model, enforce table/column and storage isolation; guest/stranger/owner/admin real JWT `select=*` tests, rollback and mobile/SSR/API checks. Production migration only after backup and explicit approval. |
| 5 | **Photo EXIF / public URL privacy** | [draft PR #86](https://github.com/SergeyGalkin91/zapruda1/pull/86): sanitized public derivative candidate; real JWT Storage-HTTP acceptance missing, legacy public original and URL revoke concerns remain. | Verify metadata-free derivative by real upload/download, Storage access policies, private→public→private and expired-link behavior, legacy backfill; no original GPS in publicly issued assets. |
| 6 | **Protected release pipeline** | PR #63 and PR #85 remain draft; unit/visual/Docker results do not prove the public pilot. | Exact release SHA: complete quality/browser/Docker, JWT/RLS, rollback/backup, GPS/photo and moderated SPOT acceptance; owner release approval. |
| 7 | **Commercial features** | [billing spec #69](https://github.com/SergeyGalkin91/zapruda1/issues/69) is design only. | Before *paid* launch: approved provider and legal entity, sandbox checkout, webhook verification, refunds/chargebacks, server-only entitlements, store compliance. Not required for noncommercial private staging QA. |

## Latest read-only privacy check

At 2026-11-03 STAGING, `has_column_privilege` reports `anon` and `authenticated` can select exact report latitude (and anon longitude). Current public reports with non-null exact coordinates: **0**. This does **not** prove data leakage, but does confirm unsafe future exposure remains unless server storage/ACL and authenticated REST tests are hardened.

## Non-blocking improvements / separate workstreams

- [Lovable extraction #87](https://github.com/SergeyGalkin91/zapruda1/pull/87): regenerate clean `bun.lock`, remove `@lovable.dev/vite-tanstack-config`, repeat CI and self-host deployment smoke. Do not delete Lovable project before rollout validation.
- Multiple older draft PRs exist. Avoid indiscriminate merging: deduplicate against PR #63 / #85, compare commits, close superseded branches only after reviewing independent fixes.
- Electric Blue appearance and existing design lock are preserved. New architecture or releases must not alter approved visual/nav without owner review.

## Immediate safe sequencing

1. Keep existing PASS scenarios untouched and preserve STAGING/production isolation.
2. Merge only verified, scope-limited fixes into the integration candidate after CI and true live checks; do not merge xAI #89 just because lint/build passed.
3. Diagnose pre-run SPOT GitHub failure; then run its protected read-only JWT preflight.
4. Finish #67/#86 real-photo/GPS security gates before permitting public uploads or SPOT market.
5. Perform real human-moderated SPOT flow; obtain release decision separately.

**Never use emulator/SQL-fixture PASS as proof of a real authenticated browser flow. No synthetic trophy or bypass of human spot review.**
