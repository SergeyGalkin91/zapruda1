# ZAPRUDA COMMUNITY — CURRENT STATUS (v0.7.1 integration)

As of 2026-11-02, source of truth for this candidate is `release/v0.7.1-integration-20261102`.
This document supersedes the obsolete 2026-10-29 snapshot **in this branch only**.

## Proven facts
- Browser application implements Supabase Auth, reports, reactions (`ReactionBar` reads `reactions`), direct messages and profile UI.
- STAGING (`yudtbifopfnjtjanaqrd`): club/trip tables, club invitation and paid-request provisioning rules; SQL role simulations and concurrent club capacity checks previously passed. Actual payment provider and real multi-user JWT/browser E2E remain outstanding.
- PROD (`sonvniuwtvzzyuglscah`): **read-only audit** showed RLS enabled on `report_private_locations` and the SELECT/INSERT policies require `auth.uid()` to own the relevant report; no mutation or actual four-role E2E performed.
- v0.7.1 MUST HAVE: `СХОДКИ`, max three including owner, location country/region/city, exact location disclosed only after acceptance. Requirements accepted in PR #53, first UI and STAGING schema delivered in PR #60; real JWT/concurrency/browser QA pending.
- Grok stage5/6/7/8 PRs #57/#56/#58/#59 remain independent branches. CI green on their own commits does not mean deploy or API E2E; do not merge indiscriminately. Stage6 has a capacity-concurrency flaw.
- Release status: **CANDIDATE UNDER CONSTRUCTION, NOT PRODUCTION RELEASE**. Only a separately tested and approved release may be deployed to main/PROD.

## Release blockers
1. Complete real JWT, concurrent third-seat, mobile E2E for `СХОДКИ` already implemented as first UI and STAGING schema in PR #60.
2. Verify auth with real user JWTs and privacy with outsider / pending / accepted / organizer identities.
3. Validate provider-verified payment before allowing paid club activation and guide commission.
4. Verify CI, browser experience and privacy on the exact release candidate SHA.
5. Review migrations and agree explicit production rollout + rollback sequence.

See README.md and docs/ZAPRUDA_HANDOFF_V071_SNAPSHOT_20261102.md.
