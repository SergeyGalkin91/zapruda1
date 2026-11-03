# ZAPRUDA COMMUNITY — UI/UX Refinement (owner-approved)
**Specification status:** approved direction, implementation stages proposed for review. **App target:** v0.7.5 SPOT draft. **Design authority:** `docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md` and final owner-approved five-phone hero; this does **not** supersede the lock. No production release or database deployment.

## Owner decision
- Preserve **Matte Black** default and **Electric Blue** option; premium refinement, **not** redesign.
- `/reports/new`: **three-step flow with autosaving draft**.
- Priority: **chat → reports → mobile usability → SPOT**; visual foundations implemented alongside these.
- Motion: subtle, functional, respects `prefers-reduced-motion`.
- No modifications to default nav labels/sequence `Лента / Комьюнити / + / Выезды / Чат` or exclusive admin access.
- No fake fish, leaders, photos, activity counts, payments, online presence or geographic pins.

## Verified current-code findings (release/v0.7.5-spot baseline)
1. `src/routes/chat.tsx`: `Мои чаты` and `Непрочитанные` are rendered as **disabled** buttons, no real visit/unread model; do not make them visually enabled without backend state.
2. `src/routes/reports.new.tsx`: one long form; a **per-user localStorage text draft exists**, restores text/fields and catches; **files are not persisted** across reload. The upload code may persist report before media; `savedReportId` avoids duplicate report on retry. Do not break that idempotency.
3. `src/components/SpotCatchFlow.tsx`: catch submission uses real STAGING backend and private photo upload, but status progression has no dedicated wizard/status-tracker experience. KING only after independent moderator verification.
4. `src/components/Shell.tsx`: correct five-button mobile bottom nav exists; shell accounts for safe-area inset and admin supplemental link. Do not move `Чат` or globally replace it with admin.
5. `src/lib/appearance.ts` and `src/styles.css`: theme stored locally, Electric Blue CSS currently uses hardcoded-color override selectors; migrate incrementally to semantic variables rather than mass search-and-replace.
6. `src/routes/chat.tsx`: thematic photo tiles reference multiple outside URLs; audit ownership, availability, fallback and loading; replace with licensed / owner-approved assets in a separate asset PR.
7. Mobile data labels and status text sometimes use 10–12px; inspect screenshots before adjusting; accessible touch targets and visible focus should be baseline.

## Delivery strategy — separate commits/PRs, independent acceptance
### Phase 0 — foundations (this draft PR)
- Add nonbreaking semantic UI design tokens for surface, elevated card, muted content, outline, brand, incoming/outgoing bubbles, status for both themes.
- Keyboard focus visibility, usable button tap heights, reduced-motion fallback.
- No new mock graphics and no UI navigation change.
- Acceptance: exact SHA TypeScript/lint/unit/build/browser CI PASS; compare 390, 768, 1440 px Matte Black & Electric Blue; capture original + after screenshots. Theme changes must not alter auth/data.

### Phase 1 — chat, highest priority
- Implement real per-user participation/recent-room and unread markers using authorized server-backed data and read receipts. If backend unavailable: retain clearly disabled feature and informative explanation; do **not** fabricate unread counters.
- `Все`, `Мои чаты`, `Непрочитанные` must have distinct actionable and accessible behavior, selected state via proper semantics; filtering preserves country/region/city and last selected room.
- Draft is scoped to room + signed-in identity; preserve text on refresh/failed sending or file upload; report image-upload failure without duplicate text message.
- Composer visible above on-screen keyboard and safe-area bottom nav; dynamic height and 44×44px primary actions; message time, replies, photo attachments and reactions readable on 320/390/768px.
- Empty states: first-time room, no unread messages, permission denied, loading, offline and retry.
- **Acceptance:** authenticated role tests for two cities and two room topics, no cross-user read receipts, unread disappears only on actual read, no false counts, failed-upload reattempt does not duplicate message, tested keyboard navigation and mobile viewport.

### Phase 2 — three-step `/reports/new` with autosave
- **Step 1: `Где и когда`**: report title, fishing discipline, optional waterbody, approximate location, date/time if available. Weather fields optionally expandable; avoid collecting exact private GPS in exposed `fishing_reports`.
- **Step 2: `Улов и история`**: zero-catch outcome explicitly supported (not fake catch), fish species/weight/length, technique/lures, narrative, up to six local photo selections, AI identification only on user click. No AI auto-upload.
- **Step 3: `Проверка и публикация`**: all entered values readable, final edit/back affordance; explicit public/private selector, privacy summary about approximate spot, image visibility and EXIF safeguards. Default visibility policy requires product/security review before altering existing persisted default. Final CTA clearly states action.
- Existing per-user local draft key remains backward compatible. Save step index + fields on change (debounced where useful), restore into prior state on reload; show `Сохранено на устройстве` vs `Не удалось сохранить`. **Photo binary is not stored in localStorage**; after reload visibly ask for reattachment.
- Back/forward never silently submits, resets file picks or alters public/private choice. Validation occurs at relevant step, focus moves to first invalid input; avoid `required` fields hidden at submit (use staged validation or mount/enable correctly).
- Network errors keep draft and previously-created report ID; retry media upload does not create a second report or duplicated catches.
- Submit only with real Supabase session; no schema or RLS shortcuts.
- **Acceptance:** 390px/320px complete wizard, all back/next paths, refresh on all steps, absent file warning, zero-catch, privacy selector, offline draft, storage-quota error, duplicate submit/retry, multi-user browser separation, proper error focus and screen-reader announcements. Test no exposure of exact GPS or unsanitized public photos; defer public rollout until #67/#86.

### Phase 3 — mobile UX, page hierarchy
- Preserve locked 5 bottom tabs; make menu usable with mobile keyboard, safe area, long localized names, device zoom and touch; no horizontal body scroll at 320/390/768.
- Reduce competing intro cards in feed, retain real report/photo as primary content. Display CTA to create first report only for actual empty states.
- Rework communities discovery hierarchy (country/region/city, clubs, meetups and guides) without dropping existing routes or authenticated visibility.
- User profile: distinguish public angler identity/trophy wall from private equipment/preferences editor; no leakage of private gear/location by default.
- Typography hierarchy: normal body ≥14px, metadata generally ≥12px with contrast; important tappable targets ≥44×44px; exceptions require documented review.
- **Acceptance:** screenshots at 320/390/768/1440 both themes; no overlays under fixed nav/keyboard, no hit-target overlaps, all major CTA in one-hand reach, real empty/error/loading states.

### Phase 4 — SPOT application status and trust
- Add user-friendly stepper `Подано → Проверяется → Решение` mapped **only** to authoritative server statuses; rejected and revoked explicitly different.
- Explain nomination: STREET vs UL, KING vs length and MICRO KING; avoid implying automatic verification or promising moderation ETA.
- Show private evidence status, eligibility and rejection reason to owner only; actual moderator controls remain server-role protected and self-review forbidden.
- Approve/deny shows confirmation state and precise error; historic winners and notifications derived from approved DB result only.
- **Acceptance:** signed JWT owner, outsider and explicitly authorized independent moderator; no fake approved spot or invented trophy; private evidence inaccessible to outsider; submit/reject/approve/revoke/race/live notification tests where authorized. Do not call this phase complete on read-only preflight PASS alone.

## Phase 4A — STREET FISHING, SPOT hierarchy and the FULL title system (owner correction)
**Required product scope; not optional decorative badges.** This section extends Phase 4; no changes to the approved global five-tab navigation.

### Distinguish the three surfaces
1. **ZAPRUDA STREET** (`/street`) = personal urban fishing session with start/end timer, approximate area, per-fish notes and route to `/reports/new`. Current state lives in browser localStorage; not a verified trophy and not server-synced. The report form has a Street-session import action; preserve opt-in and idempotence, don't silently publish.
2. **SPOT / ZARUBA** = approved geographic competition points; submission of a specific real fish to a server-reviewed nomination; no automatic champion for a local Street-session.
3. **Titles / ranking history** = records from independent authorized moderation, never determined by UI text, photo alone, geography in untrusted metadata, or non-public user location.

### Canonical title families from `src/lib/spot-records.ts`
| League | Nomination key | Canonical title | Unit / selection | Geography |
| --- | --- | --- | --- | --- |
| STREET FISHING | `spot-big-fish` | **KING OF THE SPOT** | greatest verified single-fish mass (g) | approved SPOT, by qualifying method |
| STREET FISHING | `spot-longest` | **LENGTH KING** | greatest verified length (mm) | approved SPOT, by qualifying method |
| ULTRALIGHT / MICROJIG | `ul-big-fish` | **KING OF UL** | greatest verified single-fish mass (g), UL tackle check | approved UL SPOT |
| ULTRALIGHT / MICROJIG | `ul-smallest` | **MICRO KING** | smallest verified length (mm), welfare review; not deliberately targeting juvenile fish | **same UL league/spot**, not a separate league |
| CARPFISHING | `carp-big-fish` | **KING OF THE LAKE** | greatest verified mass (g), species-specific carp/grass carp | waterbody |
| WINTER FISHING | `ice-big-fish` | **KING OF THE ICE** | greatest verified mass (g) | region + season + method + species, **no exact spot required** |
| BOAT FISHING | `boat-big-fish` | **TROPHY KING** | greatest verified mass (g), species-specific | waterbody / municipality / region / country |

Current policy only replaces an incumbent with a **strictly better** score; ties do not displace the leader. Historical/seasonal title lifecycle and tie policy require explicit owner decision. A title must be tied to a category key (league + nomination + method + scope + optional species/season) and not granted globally to a user based on a single catch.

### Required interface architecture
- `/street`: hero `STREET FISHING`, one primary action **Начать сессию** or **Продолжить сессию**, elapsed timer, local catch log, then **Оформить отчёт**; separate secondary link **Участвовать в SPOT** if qualifying approved spots exist. Clear distinction `Личный дневник · не участвует в рейтинге`.
- SPOT discovery: user first chooses one of the five disciplines (only available STAGING/approved leagues enabled, others `Скоро` with explanatory state); then scope/approved spot, nomination and rules; only confirmed map pins.
- A SPOT card: official name, city/region, eligible disciplines/method, two nominations where applicable, real participant/leader counts if available, **Участвовать** primary and **Рейтинг** secondary; no fake leaders, sample coordinates or unlocked private pins.
- Verified nomination card: icon/crown + canonical title, verified value/unit, species/method/scope, valid season where relevant, moderation timestamp, profile/avatar only with explicit consent; separate `Нет подтверждённого рекорда` state.
- Catch state UI: **Черновик → Подано → На проверке → Подтверждено / Отклонено / Отозвано**. Display only states actually backed by server; UI may group statuses for readability but must never pretend a server verification happened.
- Leaderboard: current holder, challenger if any, **История титула** (winner/record transitions), tie rule disclosure, server-derived counts and explicit scope `этот спот` vs `этот водоём` vs `регион`; accurate title revocation, no stale crown after reversal.
- Angler profile: `Мои подтверждённые титулы` and `История достижений` separated from local sessions and unverified reports; no imaginary ranks/earned badges. Achievement badge is an independently modelled concept, not an alias for SPOT champion.
- Chat/Community hooks: user can voluntarily share a **public safe record card** or link a finished Street session to a report; never automatically send precise GPS/evidence originals or reveal protected fishing spots.

### Additional UX acceptance
- [ ] Real-world flow `Start Street session → record catch → finish → opt-in report → choose safe visibility` survives refresh, failed upload and cancellation without duplicate public entities.
- [ ] UI visibly distinguishes diary catch, unverified report, pending SPOT proof, confirmed champion and revoked champion.
- [ ] Each of the seven title names is correct and category-bound; MICRO KING remains inside UL and uses independent ethical moderation.
- [ ] Empty approved-spot catalog yields helpful no-spots state, no fake KING cards and no fabricated participant numbers.
- [ ] Public leaderboard/notifications do not leak exact GPS, private evidence, EXIF, unconsented photos or identities.
- [ ] Real JWT tests for different owners/moderator and attempts at self-approval; concurrency and revoked-title cases; no claims of a full live KING E2E before all required gates.
- [ ] Smartphone 320/390px: one primary action per screen, clear status labels, touch targets ≥44×44px, accessible expansion for title rules and nomination selection.
- [ ] Stage rollout by league: STREET+UL first; CARP/WINTER/BOAT future phases until real data, moderation and tests support them; **do not show a disabled future league as an active released feature**.

## TROPHY KING — species-specific editorial nicknames (owner-requested)
Keep **TROPHY KING** as the canonical verified BOAT FISHING nomination. Add a separate optional **editorial subtitle** keyed to the confirmed species (not a new ranking title, not a claim of unnatural size). Style: energetic street-fishing language; accessible sentence-case fallback for formal tables and screen readers.

| Fish | Punchy display subtitle | Reserved alternative |
| --- | --- | --- |
| Судак | **ЛЮТЫЙ СУДАК!** | Судачий трофей |
| Щука | **ЩУКА-МУТАНТ!** | Щучья королева |
| Окунь | **ПОЛОСАТЫЙ МОНСТР!** | Король полосатых |
| Берш | **БЕРШ-БЕСТИЯ!** | Редкий трофей |
| Жерех | **РЕЧНАЯ ТОРПЕДА!** | Серебряный хищник |
| Сом | **УСАТЫЙ ТИТАН!** | Речной гигант |
| Голавль | **ЛОБАСТЫЙ БОСС!** | Краснопёрый трофей |
| Налим | **НОЧНОЙ МОНСТР!** | Хозяин глубин |
| Форель | **ПЯТНИСТАЯ МОЛНИЯ!** | Форелевый трофей |
| Other species | **ТРОФЕЙ ПОДТВЕРЖДЁН** | Подтверждённый рекорд |

**Acceptance:** subtitles can appear in trophy profile cards, public leaderboards and title-change notifications *only after verified title award*. Use real species identifier from server-authenticated moderation. Do not calculate a subjective "monster" tier from weights until an owner-approved per-species rule exists. Preserve scope, season, species and canonical title; no fake holder, photo or measurements. Ensure readable responsive typography at 320/390px and keep EXIF, GPS and original evidence private. Future user-adjustable tone (дерзко/сдержанно) is optional; defaults require owner UX approval.

## Trophy thresholds & notification processing (owner direction; numeric values PENDING owner approval)
**Purpose:** no noisy worldwide notification for each catch; species-specific minimum weight to qualify for an editorial trophy caption, with no maximum weight. Distinguish **verified catch**, **current KING record** and **trophy eligibility**. A new local KING may weigh below trophy threshold; it gets a neutral server-authenticated record message, **not** the `ЛЮТЫЙ СУДАК!` fanfare. Conversely a verified trophy may not beat the current KING; it can earn a trophy badge while not becoming champion.

### Suggested thresholds — DRAFT, not validated ecological/legal standards
All server processing uses integer grams; UI converts to kilograms. Threshold comparison is inclusive `>=`; no upper bound.
| Species | Trophy grams >= | Exceptional grams >= | Editorial caption |
|---|---:|---:|---|
| Судак | 4000 | 8000 | ЛЮТЫЙ СУДАК! |
| Щука | 7000 | 12000 | ЩУКА-МОНСТР! |
| Окунь | 1000 | 2000 | ПОЛОСАТЫЙ БОСС! |
| Берш | 700 | 1200 | БЕРШ-БЕСТИЯ! |
| Жерех | 4000 | 7000 | РЕЧНАЯ ТОРПЕДА! |
| Сом | 20000 | 50000 | УСАТЫЙ ТИТАН! |
| Голавль | 1500 | 3000 | ЛОБАСТЫЙ БОСС! |
| Налим | 3000 | 6000 | НОЧНОЙ МОНСТР! |
| Карп | 10000 | 20000 | КАРПОВЫЙ ГИГАНТ! |
| Лещ | 2000 | 4000 | БРОНЗОВЫЙ ТЯЖЕЛОВЕС! |
| Unconfigured species | none / suppress automated trophy signal | none | Neutral verified catch only |

**Pending decisions:** owner validates each threshold (possibly region/league dependent) and whether fishing-specific trophy eligibility must be limited by legal season, length, release/welfare rules. Display a config version and effective date; never silently recalculate historical trophy grades on threshold edits. Never use photo-recognition output as authoritative species or weight.

### State machine (server side)
`draft → submitted → pending_review → verified | rejected → revoked` with terminal/reversal audit as appropriate.
1. User submits catch + one proof bundle; unverified data can show `На проверке` to OWNER only, **no public trophy badges, title fanfare, social/push notification**. Optional owner-only receipt of submission is separate.
2. Independent authorized moderator verifies species, single-fish weight, measurement evidence, provenance, method, geography/legal and evidence privacy; no self approval. Evidence integrity and duplicate/similar proof require review.
3. On server transaction commit, calculate separately:
   - eligibility for KING category via existing `spot-records.ts` deterministic policy and single-holder arbitration,
   - `trophy_level`: `none` if below configured threshold or species unconfigured; `trophy` if weight >= min; `exceptional` if >= exceptional. No max.
   - public sharing eligibility: author opt-in, only safe metadata, explicitly approved photos.
4. Persist immutable event `catch_verified`; `trophy_awarded` only on threshold crossing (one event per catch / threshold config version), `title_changed` only on real record holder transition; attach moderation decision, deterministic idempotency key. Do not send inside database transaction; enqueue only after successful commit.
5. Notifications scoped and routed *after* transaction:
   - **owner inbox**: verified trophy/title change immediately (in-app, subject to preference for push); submit status via private activity.
   - **previous title holder**: direct notification only on actually lost title (not for every large fish).
   - **subscribers to same verified spot/league**: optional `title_changed` and `exceptional_trophy` if consent and follow preference. Default **in-app only**; push off until explicitly opted in.
   - **followers of author**: `exceptional_trophy` only when author opts to share and recipients opt into trophy notifications.
   - **other cities, nonfollowers, visitors**: NO blanket broadcast. Global public discoverability only via approved feed, separate opt-in editorial digest after moderation and rate limit.
6. Deduplicate delivery per `(event_id, recipient_id, channel)`, honor mute / block / unsubscribe / privacy, per-user frequency cap (suggest max 1 trophy push per spot per day, digest overflow), quiet hours local to user and safe notifications without exact location/EXIF. Repeated server requests and retries never duplicate awards/notifications.
7. Revocation/error handling: withdraw badge/title; rebuild current title atomically from eligible verified candidates; emit `trophy_revoked`/`title_changed` only if state genuinely changed; remove/revoke public derived image according to privacy. Cancellation of queued notifications and corrective notifications to affected users where already delivered.
8. UI style: only display crown animation for recipient after trusted verified award, under 200ms, reduced-motion no animation. Normal verified catch quiet; true exceptional trophy uses species slogan. When trophy threshold not met but KING title changes, use `Новый KING OF THE SPOT` without "monster" language.
9. No separate KPI or achievements awarded from mere chat activity under `TROPHY KING`; activity ranks use independent badges/progression.

### Acceptance matrix
- [ ] Boundary: at threshold minus 1 gram => `none`; exactly threshold => `trophy`; exceptional boundary => `exceptional`; arbitrarily high legal weight remains exceptional; unknown species no automated slogan.
- [ ] Champion below trophy limit: record change YES, trophy popup NO. Trophy catch below reigning champion: trophy YES, `title_changed` NO.
- [ ] Pending/rejected/duplicate proof/private/illegal/self-reviewed events: public trophy/notification NO.
- [ ] Four independent signed JWT users, outsider, actual moderator: privacy, authorization, opt-in, rate limits, idempotency and no cross-user disclosure.
- [ ] Scope per approved spot/league, subscription/follow logic, current user mute/block; never broadcast all users. No blanket push; digest overflow.
- [ ] Concurrency: two simultaneous challengers => single KING and one event per successful title transition; correct prior holder.
- [ ] Revocation, edited evidence, author deletion and consent withdrawal retracts public trophy and stops future notifications.
- [ ] Unit conversion UI uses grams underlying; portrait mobile 320/390, large text and restrained crown animation; no public EXIF/GPS.
- [ ] No production deployment, DB migration, live push provider, public champion or active threshold rules before numeric-owner approval and staging E2E.

## Design system contract
| Token role | Matte Black target | Electric Blue target |
|---|---|---|
| `--zc-ui-bg` | `#090B0C` | `#1239A6` |
| `--zc-ui-surface` | `#141A1E` | `#19357F` |
| `--zc-ui-surface-raised` | `#1B2024` | `#23438D` |
| `--zc-ui-accent` | `#D7FF35` | `#D7FF35` |
| `--zc-ui-secondary` | `#A99AD9` | `#E2E8FF` |
| `--zc-ui-outline` | `#343640` | `#5B75C0` |
| `--zc-ui-ink` | `#FFFFFF` | `#FFFFFF` |

Use semantic tokens in newly built components; old hard-coded CSS must be migrated **component by component** with screenshot evidence, not in a global blind replacement. Preserve approved five-phone composition, real angling imagery and typography. Animations: short 120–200 ms subtle transitions for controls/status only; no continuous shimmer as a prerequisite; reduced-motion disables nonessential transitions/animations.

## Acceptance gate / definition of done
- [ ] No production Supabase, main branch, payments, data schema, RLS or design-lock edits.
- [ ] GitHub draft PR; commit(s) mapped to a phase, no unrelated feature changes.
- [ ] Exact-commit `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and Docker preview PASS.
- [ ] Browser screenshots of **actual** UI, both themes at 320, 390, 768, 1440px; screenshot URLs or workflow artifacts attached; compare to owner five-phone source once asset available.
- [ ] Keyboard-only flow, visible focus, labels, announcements and `prefers-reduced-motion` verified; no WCAG 2.2 AA claim without contrast/audit evidence.
- [ ] No fake counters/pins/photos and no client-side elevation of moderator/admin permissions.
- [ ] Real signed JWT STAGING checks when touching chat/spot/report behavior. No production release until safety gates are separately accepted.
- [ ] Explicit owner review/approval of appearance changes before merge and design-lock update only if a *new* visual direction is separately approved.

## Out of scope
Lovable removal (#87), Grok provider credentials (#89), production billing (#69), production deployment, altering community geography model or public nav, and forced appointment of moderator. These have their own release/security gates.
