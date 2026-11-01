# Grok Stage C status — 2026-11-01

## Stage B (PR #19) review

- Branch: `fix/chat-stage-b-design-lock-20261101` @ `1551036412d7c8219eb414f0678cd3266187e16b`
- Title catalog: **ZAPRUDA SPOT** (approved rename; do not revert to «Свои на связи»)
- Guest can view six rooms; enter/send requires auth
- Geo aside hidden below `lg`
- Lime activity indicator + timestamp only when `roomLastMessages` has real rows
- No fabricated unread badges or balances
- CI: quality ✅ docker-smoke ✅; Netlify deploy-preview ready
- Grok did **not** attach independent 390px screenshots in this pass

## Stage C branch

- `grok/stage-c-thread-ui-20261101` from PR #19 head
- Workflow `.github/workflows/apply-stage-c-thread-ui.yml` applies thread UI polish when dispatched
- Target PR base: `release/v0.7.0-alpha`

## Thread UI goals (five-phone / Споты и вода style)

- Header: topic image + topic name + place context
- Message count only from loaded array length
- No fake pins or participant totals
- Incoming lilac / outgoing lime bubbles retained
- Mobile safe-area on list + composer
- Logic for send/photo/reactions/realtime unchanged

## Blockers

Grok GitHub connector cannot reliably PUT ~40KB `chat.tsx` blobs; Stage C code is applied via Actions workflow_dispatch.

## Next for ChatGPT

1. Run workflow **Apply Stage C thread UI** on the Stage C branch
2. Verify CI + Netlify preview
3. Owner visual sign-off before merge
