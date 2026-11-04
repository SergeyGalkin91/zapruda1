# ZAPRUDA COMMUNITY — v0.7.5 SPOT
**Release train / implementation contract** · 03.11.2026 · Status: PLANNED / NOT RELEASED

## Source of truth
- Current implemented baseline: `v0.7.1` integration PR #63. This branch was forked from `fix/issue61-v071-p0-stages-5-8`; do not represent this fork as fully implemented v0.7.5.
- Unified product/business architecture: #84; expanded league requirements and geography: #83; SPOT MARKET: #64; geo security P0: #67; approved Electric Blue palette: #76 / PR #82.
- Approved visual design baseline: `docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md`. Keep Matte Black default and optional Electric Blue #1239A6 / Lime #D7FF35 / Eggplant #614051, without dark/olive green.

## Version scope
### Core social product
Keep the functioning existing community, profiles/gear, feed, chats, reports, free СХОДКИ and AI assistant contracts. Do not regress or silently change current navigation.

### One shared competition and verification engine
- One catch ID represents **one fish**, with species, capture time, fishing discipline, measurement and photo/video proofs. Never sum fish to award BIG FISH.
- Server-side admission and fishery-rule validations; staged `pending → verified/rejected`; manual appeal; photo integrity checks and protected originals/EXIF-free public copies.
- Transactions for record changes and unique title holders per complete ranking key; auditable history and atomic replacement after superior verified entry; revocation/recalculation.
- Notification via in-app inbox and opt-in push to participants/subscribers in the corresponding category and region, including previous title holder; dedupe/idempotency and privacy-safe summaries.
- Proof of method/gear and geographic eligibility can be insufficient from a photo alone: moderation and explicit evidence standards are mandatory.

### Exactly five top-level fishing leagues
1. **STREET FISHING:** verified public urban ZAPRUDA SPOT pins, methodology-specific BIG FISH → KING OF THE SPOT; independent LENGTH KING (max verified length with board).
2. **ULTRALIGHT / MICROJIG:** *one* league and *one* UL-spot catalog, two nominations: KING OF UL (largest verified single fish by mass) and MICRO KING (smallest legal, ethically documented fish by length). MICRO KING is **not** a separate top-level league; require protections against targeting juvenile fish.
3. **CARPFISHING:** waterbody/optional managed sector, separate species rankings for carp and grass carp, KING OF THE LAKE, welfare-conscious weighing.
4. **WINTER FISHING:** region + season + method + species; KING OF THE ICE, **no mandatory exact spot or GPS**; safe-ice and legal restrictions.
5. **BOAT FISHING:** officially approved title **TROPHY KING** by species at waterbody, municipality/city, subject/region, and Russia levels; verified actual capture jurisdiction on cross-region rivers, private GPS by default.
- Historic vs seasonal rules, ties, retroactive catches and evidence standards require written acceptance before code deploy. No fake records or seeded public champions.

### Geography and catalog
- Mandatory phase-one UL cities: **Москва, Санкт-Петербург, Екатеринбург, Нижний Новгород, Казань, Пермь**.
- The candidate-waterbody research covering 20 major cities is stored in #83; every actual pin requires legal access, safe bank, permitted technique, rights to geo source, exact location verification and moderator approval. Candidate != public spot.
- Public spots and waterbodies must never reveal private owner catches or SPOT MARKET paid locations; secure geodata boundary must be verified before public mapping.

### SPOT MARKET and business integration
- Preserve planned author-owned private maps and fishing place collections, permissions/rights, marketplace reviews, dispute and refund workflow, and seller onboarding. Public record/trophy status may inform reputation but must not be a paid listing guarantee.
- No actual marketplace launch or cash handling until verified payment service provider, server entitlements, cancellation/refund flow, consumer/tax/legal checks, and complete #67 GPS/EXIF/RLS protection. Free СХОДКИ remain free. PRO/AI subscription follows independent billing readiness.
- The 100 RUB floor and «Рыбки» 1:1 RUB are design hypotheses; no invented commission, bank escrow, settlements, earnings or production purchase labels.

## Target user journeys
- STREET/UL: community/feed → map → eligible SPOT → subscribe/join ZARUBA → submit single fish with proof → verification → update records/titles → notifications → profile/history.
- CARP: waterbody → sector if supported → verified single carp/grass carp → KING OF THE LAKE.
- WINTER: region/season/type/species → verified catch → KING OF THE ICE; no mandatory map.
- BOAT: waterbody/region/city/species → private regional proof → TROPHY KING at qualifying levels.
- MARKET: authorized seller publishes licensed content → safe preview → authenticated payment → confirmed webhook → server entitlement → private delivery → support/refund; independent of free SPOT pins.

## Execution work packages
- **GATE 0 (no public release):** all existing v0.7.1 authenticated E2E with four distinct email-confirmed STAGING users, reviewed secrets and roles; resolve geo P0 #67; review STAGING/PROD schema drift, backups, restores and current production hosting.
- **P1 platform & data:** audit existing tables before schema design; geo public/private DTO; verified locations and geofences; competition/ranking keys; event outbox; RLS, rate limit, moderation role matrix.
- **P2 core vertical slice:** first STREET + UL spots in six cities, verified catch, leaderboards, KING replacement, history and notifications; genuine JWT E2E + mobile/desktop visual QA.
- **P3 additional leagues:** CARP / WINTER / BOAT, LENGTH KING and ethical MICRO KING, with their region and method-specific validation.
- **P4 monetization:** SPOT MARKET sandbox purchase and revoke rights, then legal/finance review and staged roll-out; PRO/AI pricing tested independently.
- **P5 release:** build/typecheck/lint/tests, real authorized role E2E, data security and media privacy, concurrency & notification tests, cross-browser 390px/desktop palette, backup/rollback rehearsal, owner acceptance and observable production rollout.

## Exit acceptance: release MUST NOT occur if any fail
- v0.7.5 UI and server actions actually exist and work on STAGING; not just issue docs.
- Unauthorized users and guests cannot read private/paid GPS, photo EXIF, or unpurchased content through REST, Storage, RPC, Realtime, SSR, logs or notification payloads.
- Catch provenance, weight, species, method and region acceptance; duplicate image and concurrent record cases; no multiple current kings for one ranking key; title revocation; appeals and notification idempotency.
- All five leagues verified on STAGING, including winter without spot, BOAT across region boundaries and UL MICRO in one navigation group.
- Public spots legal and approved; fishery restrictions, season and user safety checked; ethical minimum-catch safeguards.
- Test logs, screenshots, CI run links and exact commit SHA attached to release review; no placeholders presented as success.
- Paid features only if verified legitimate money movement and refunds; otherwise explicitly disabled and scoped out of launch.
- No `main` merge, Supabase production change, app release, tag or deployment until the above checks pass.

## Status log
- 2026-11-03: created release preparation branch and this release contract. **No 0.7.5 feature implementation asserted; version in package.json remains 0.7.1 by design.** User requested release; production deployment blocked by identified missing verification and features.
