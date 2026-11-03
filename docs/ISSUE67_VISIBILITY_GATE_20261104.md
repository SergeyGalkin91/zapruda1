# GPS/photo privacy follow-up — 4 November 2026 (MSK)

The profile trophy gallery still signed original files for one hour. It now
uses the same sanitized gallery loader as the feed. The approved design and
navigation are unchanged.

## Enforced candidate behavior

- `report-photo-access` serves only a canonical trusted JPEG derivative. Each
  GET checks publication/ownership through the caller's RLS before and after
  downloading from the fixed private derivative bucket. Responses use
  `Cache-Control: private, no-store` and `CDN-Cache-Control: no-store`.
- Public photo URLs contain only a photo UUID. They contain no token, Storage
  path, original filename or coordinates. A later request after making the
  report private returns 404. Bytes already downloaded cannot be withdrawn.
- The gateway's public GET intentionally uses `verify_jwt=false`; private GET
  and all DELETE requests validate the supplied real JWT using Auth `getUser`.
  DELETE also requires a confirmed non-anonymous report owner and removes only
  the resolved derivative and corresponding metadata. It supplies a bounded
  cleanup path for private transport QA fixtures.
- A new restrictive Storage boundary denies direct derivative SELECT to anon
  and authenticated users, preventing them from minting reusable Storage
  tokens even while a report is public. Legacy original access remains owner
  only; no original is published by the gallery.
- Public report SELECT grants exclude legacy exact `latitude` and `longitude`
  columns. Exact-field REST requests fail closed. Existing strict NULL checks,
  approximate rounding and owner-only private coordinates remain in place. A
  restrictive private-location policy protects against later permissive rules.

## Rollout and evidence

The existing photo migrations were compared with live STAGING; they must not be
reapplied. The existing GPS NULL constraint is already effective. The two new
reviewable delta sources are `supabase/staging/v075_report_photo_access_gate.sql`
and `supabase/staging/v075_report_coordinate_acl.sql`. Apply only to STAGING
`yudtbifopfnjtjanaqrd`, record the generated hosted migration versions, and
verify actual column privileges and Storage policy readback afterward.

Local verification passed **270 tests / 21 files**, strict types, lint (0 errors,
6 existing Fast Refresh warnings), production build and diff checks. This
includes real isolated PostgreSQL policy tests and offline handler regressions
for publication changes, private paths, authorized deletion, corrupt bytes,
no-cache headers and private-error suppression. These are not live JWT E2E.

Hosted acceptance must use the existing protected four-role credentials: a
clearly marked PRIVATE transport-only report, metadata-bearing synthetic JPEG,
actual owner JWT upload/download, denied guest/stranger download and deletion,
idempotent upload, owner cleanup and zero remaining fixture rows/objects. Never
publish the synthetic image as a real catch or award a title for it.

Production `sonvniuwtvzzyuglscah` remains unchanged. Its older original-photo
policy, one legacy object, exact-coordinate transfer trigger and older advice
schema differ from STAGING. A reviewed target schema, backup/restore and separate
production authorization are still required. Previously issued Storage tokens
and downloaded copies are not retroactively revoked by this candidate.
