# ZAPRUDA COMMUNITY — ON SPOT+ release contract
**Owner decision:** 05.11.2026 — «Давай добавим ее сейчас в релиз 0.7.6 KING FINISH ON SPOT+. Только доработай ее сначала, думаю это важно».
**Target release:** `0.7.6 KING FINISH ON SPOT+` (owner-approved target name and P0 scope).
**Status:** APPROVED PRODUCT SCOPE, **PARTIAL IMPLEMENTATION / NOT ACCEPTED / RELEASE NO-GO**. Первый code slice: [PR114](https://github.com/SergeyGalkin91/zapruda1/pull/114), каталог/явное участие/access guards; новая дельта не применена, реальные OSP gates не закрыты. Все OSP-01…09 по-прежнему P0. No change to actual technical version `0.7.5`, package.json, tags, releases, main or Production.
This later scope decision **supersedes** the earlier D21 backlog-only classification; historical D21 remains for audit.

## 1. Definition and positioning
**ON SPOT+** = voluntary proximity-based social layer integrated with existing SPOT, STREET, Chat and СХОДКИ. Its purpose is to help consenting anglers find a local chat, invite each other to fish and share a trip or group photo. It must **not** be a map revealing where individuals are fishing, a tracking service, or an automated dating/friend service.

### Primary journeys
- From SPOT or map, **«ON SPOT+ / Рыбаки рядом»** opens a **named waterside zone** (bank-access-aware), list/chat and clear privacy controls. Opening a map never checks the person in.
- User opts into **«Войти в локальный чат»**; chat participation **does not** imply public physical presence. The user may join a chosen zone without precise GPS access where product/moderation rules permit; label this as participation, not verified physical location.
- Separate time-limited **«Я на рыбалке / открыт к знакомству»** creates a voluntarily discoverable presence **in the coarse zone**, with no exact coordinates or distance to that user. The visible profile is limited to what the owner has made public.
- **«Порыбачим вместе?»** sends a request; reciprocal acceptance permits 1:1 conversation/meeting invitation; never automatic friendship/follow.
- **«Позвать компанию»** is a local announcement **only** to people with a separate invitation opt-in, rate limited. No one-time radius scan push to all nearby app users.
- At/after outing, **«Совместный выезд»** may link existing report/СХОДКА flows; **shared photos** require explicit permission of each identifiable participant and GPS/EXIF scrubbing. No silent auto-sharing.

## 2. Mandatory scope for 0.7.6 acceptance
Track under extension IDs **OSP-01…OSP-09**, **separate from and in addition to** the existing canonical 56 feature IDs. Never delete, renumber or silently mark any of those 56 as complete.

| ID | Acceptance obligation | Required evidence |
|---|---|---|
| OSP-01 | Entry from SPOT/map into a real named-zone ON SPOT+ experience, themed in approved Premium UI; empty/loading/error states | STAGING hosted 320/390 screenshots and route test |
| OSP-02 | Explicit opt-in/leave to zone chat with membership auth/RLS; no user GPS published | Two real test JWTs, deny-by-default tests |
| OSP-03 | Real-time local chat messages, moderation/report/block and membership controls; avoid duplicate chat architecture | Cross-account E2E, unread/read state if reused |
| OSP-04 | Separate opt-in status «открыт к знакомству», expiry TTL, manual off/revoke; no ghost after logout/account switch | Positive and negative E2E, expiry and invalidation tests |
| OSP-05 | Discoverability of only consented profiles in a coarse zone; defend against small-group and repeated-search deanonymization; no exact pings/distances | Abuse/privacy tests, output inspection |
| OSP-06 | Mutual 1:1 meet-up invitation request/accept/decline/cancel/block; no automatic friendship or disclosure | Two-user transaction E2E |
| OSP-07 | Opt-in local broadcast invitation with rate limits, report/mute, push only with separate consent if push support exists. If reliable push is not integrated, implement **in-app inbox** as acceptance minimum and explicitly mark push as not shipped | Rate-limit, no-delivery-after-optout, cross-zone isolation |
| OSP-08 | Joint trip/photo UX tied to existing report/СХОДКА, explicit consent by visible/linked account holders, private fallback; photo EXIF strip; no automatic publishing | Signed-in STAGING flow and revoked-consent case |
| OSP-09 | Settings, auditability, deletion/retention, no GPS/EXIF leaks, load/abuse tests, accessibility, 320/390 mobile verification, full hosted E2E/CI | Security/privacy and mobile QA evidence |

**Shipping boundary:** Full items OSP-01..09 are P0 for target 0.7.6. Any item not passing remains **BLOCKED** and keeps release **NO-GO**, unless owner explicitly approves a changed scope. **Do not claim future phases complete.** The minimum notifications commitment is safe in-app delivery; mobile push is conditional on provider capability, user permission and a separate explicit go-ahead for external notifications.

## 3. Geospatial model / anti-deanonymization
- A user-proposed **≈1 km** is a discovery heuristic **not** a promise to expose exact user position or an exact-radius geofence. Choose **moderated coarse geographic zones**, shoreline/accessibility considerations and existing SPOT access rules; do not expose user's point, bearing, distance or positional history.
- Default OFF. A user may browse map while completely invisible. Separate scopes for (1) membership in a local chat, (2) discoverable presence, (3) local announcements/invitations, (4) notifications, (5) joint photos.
- Presence expires (provisional **2 hours** maximum) and is revoked immediately on explicit exit, account switch, logout, blocking, loss of permission or zone closure.
- Avoid showing precise participant counts or identity clues in tiny zones (k-anonymity-like threshold, bucketing/coarsening and throttling; threshold to be established in security review). Avoid refresh-based triangulation, boundary probing and presence scraping.
- Backend authorization (not merely hidden UI), per-zone RLS, blocklist enforcement, abuse moderation and rate limiting; no log/analytics of exact GPS or photo EXIF.
- Avoid access to sensitive spots/private groups, exact trophy locations and KING evidence, including through chat invites or nearby-list queries.
- No fictitious anglers, chats, catches, live count, shared photos or map markers in production UI. Loading, empty, denied and permission states are mandatory.

## 4. Architecture requirements / sequencing
1. Inspect existing `SPOT`, `Chat`, `STREET`, `СХОДКИ`, `Auth`, map and privacy infrastructure; write concise implementation design and threat model **before schema/API edits**, reusing existing services. Do not create duplicate chats or duplicate migrations.
2. Stage 1: named zone catalog/access model + opt-in local chat + membership guard.
3. Stage 2: separate discoverable presence with TTL, conservative area presentation and block rules.
4. Stage 3: mutual invites, in-app inbox/broadcast rate limits, opt-outs.
5. Stage 4: joint trip/photo with participant approval and EXIF/privacy controls.
6. Stage 5: real STAGING end-to-end across at least two independent JWT identities, both theme variants, wallpaper preferences, Chromium/Firefox/WebKit and mobile widths, security checks, no production network requests. Evaluate performance and empty states with zero users.
7. Use separate work branch from current PR #93 staging code and a reviewable PR; docs belong in existing PR #111. **Never** mutate Production, main, tag, version, deploy to public until all gates.

## 5. Relationship with KING FINISH
- KING titles/independent moderator/real evidence requirements remain unchanged and blocking for full 0.7.6 release.
- ON SPOT+ **adds** a distinct P0 gate; it cannot compensate for or relax KING, guide schema, QA and Production readiness.
- All original 56 IDs, 8 modules and 7 KING titles persist. OSP-01…09 are **new extension acceptance requirements**, not renumbering existing identifiers; they add a social feature under SPOT/Chat rather than silently increasing the count of top-level modules.
- The premium STAGING visual preview may be shown and reviewed before ON SPOT+ and KING are complete; this does not count as release GO.

## 6. Owner approval and decisions still needed before sensitive launch
Approved now: target name, concept, full P0 deliverable scope, ability to develop/test in **STAGING**. Before production, confirm actual zone policy, data retention, moderation responsibilities, any precise geolocation collection and whether opt-in notifications go beyond in-app; use conservative privacy defaults meanwhile. These unresolved parameters **do not** justify shipping unsafe defaults.

## 7. Links
Prior concept: [ON SPOT / Local Crew](ZAPRUDA_ON_SPOT_LOCAL_CREW_CONCEPT_20261105.md).
[Product spec](ZAPRUDA_CURRENT_PRODUCT_SPEC.md) · [Feature matrix](ZAPRUDA_FEATURE_MATRIX.md) · [Release gates](ZAPRUDA_RELEASE_GATES.md) · [Decision log](ZAPRUDA_DECISION_LOG.md).
