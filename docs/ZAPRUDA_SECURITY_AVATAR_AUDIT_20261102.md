# ZAPRUDA security/reliability checkpoint — 2026-11-02

Scope: release v0.7.0-alpha + draft avatar/auth branches. Static source review only; not a penetration test and not production validation.

## Confirmed GitHub branch topology
- PR #28 (preview/auth-onboarding-staging-20261101) targets release/v0.7.0-alpha; contains test auth and profile onboarding.
- PR #29 (feat/avatar-defaults-crop-20261102) targets #28 branch; avatar feature draft.
- PR #32 (preview/avatar-upgrade-staging-20261102) targets release/v0.7.0-alpha and contains the preview of avatar work; staging hostname special-cased in client.
- PR #30 (fix/remove-supabase-as-any) targets main, remains open; typing fixes NOT automatically present in #29 or #32.
- PR #31 (fix/typescript-zero-errors) targets main, remains open; type safety fixes NOT automatically present in avatar branch.
- Never merge PR #32: it is preview-only and contains deployment-specific staging routing.

## P1 issue fixed by this PR: orphaned Storage objects
Profile upload flow previously uploaded to the public `avatars` bucket and then updated `profiles.avatar_url`. When update failed, the newly uploaded file was orphaned. New code attempts owner-authorized Storage removal on DB update failure and logs removal failures. This is best-effort, not a distributed transaction.

## Other risks and verification status
1. **Preview-only staging routing**: client.ts has a special-case for preview hostnames and otherwise falls back to a production project URL and publishable key. Do not reuse this code as a general deploy architecture. Production/staging environment isolation should be an explicit build deployment configuration with a fail-closed staging check.
2. **Avatar variants**: #29 currently renders ten deterministic vector placeholders; selected 10 WebP artwork has NOT landed in repository.
3. **Default assignment**: based on auth UUID hash and stable without schema migration; not uniformly sampled by a cryptographic draw, though UUID itself is random. No stored `default_avatar_id` yet.
4. **Deleting custom avatar**: clears URL first and attempts Storage deletion only under authenticated user's object path; if Storage removal fails, an orphan remains. Cleanup and periodic audit recommended. Replacing a custom avatar currently leaves the prior file unused.
5. **Browser QA**: there is no verified mobile device screenshot/video demonstrating crop drag/zoom/refresh/delete in preview #32. Successful build does not prove the interactive UX.
6. **PR #30/#31**: described by Perplexity as type fixes; actual integration into release needs diff review and branch-specific typecheck. No claim that all errors are absent from #29.
7. **Security RLS**: code and migrations reviewed selectively; no authenticated multi-user adversarial RLS tests performed.
8. **Geolocation privacy**: public fishing report coordinate disclosure requires product privacy decision and threat-model tests before changing report inserts.

## Recommended release gates
- Unit test upload rollback and repeated replace/delete with an authenticated staging fixture.
- Confirm browser/mobile crop and 512×512 WebP results, verify persistence after reload.
- Verify Supabase STAGING policies deny cross-user INSERT/UPDATE/DELETE, and list public-read expectations.
- Verify auth email redirect and profile save against current QA preview URL.
- Keep production protected; merge tested functionality via release-targeted PR after approval.
