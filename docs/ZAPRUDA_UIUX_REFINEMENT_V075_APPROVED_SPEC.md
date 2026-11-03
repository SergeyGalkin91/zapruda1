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
