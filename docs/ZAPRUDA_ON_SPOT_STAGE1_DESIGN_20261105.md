# ON SPOT+ stage 1 — implementation boundary before schema/API edits

Branch starts from PR93 37eb39aa92e55607e58234f264da0470c973fe10. This is the first reviewable implementation slice, not acceptance of OSP-01…09 or release approval. All56 legacy IDs/8 modules/7 KING remain.

## Reuse and authority

Reuse chat_places/chat_messages/reactions/photos/read-state, existing user JWT and Realtime, existing chat-photo brokers and account boundary. Add a service-moderated named-zone registry linked to an actually approved public SPOT, explicit owner membership and service-only zone bans in a private schema. No new message/photo storage engine. The new chat place kind is spot-zone; ordinary clients cannot provision or approve it.

Catalog/join/leave RPCs require current confirmed non-anonymous Auth users and accept no user ID. Membership is participation in a chosen chat, never physical presence. No geolocation request, coordinates, distance, people list, presence, live counts, broadcasts, follows or implicit photo consent. OSP-04…09 remain required P0 and unimplemented in this slice; OSP-03 realtime reuse does not claim complete report/block/moderation UX.

## Threat model and database boundary

Nonmembers, departed/banned users, closed zones, revoked source SPOT and anonymous/unconfirmed accounts must not read/write a zone via direct REST, message/reaction/photo joins, read receipts or RPCs. Use restrictive guards alongside existing permissive chat policies; add a narrowly bounded zone-only insert policy. A fixed-search-path private SECURITY DEFINER boolean guard is needed to identify closed/orphaned zone rooms without exposing private membership tables. Do not weaken existing owner/confirmed checks. Keep private schema USAGE/table grants revoked for browser roles; PUBLIC/anon RPC EXECUTE revoked.

An orphaned spot-zone room stays private. A source registry row or room-kind change must never turn existing zone messages public. Explicit inaccessible/unknown chat IDs fail closed in the UI; never fall back to posting in the global chat. Bind each client RPC to its captured confirmed actor's JWT and discard late responses after identity changes. Join is idempotent, serialized per actor and limited to10 active memberships; leaving deletes only one's membership and cannot erase a moderation ban.

## Operator/data boundary

Create no fake public zones/SPOT/catches or moderator assignments. Actual STAGING presently has0 approved/reviewed SPOT and0 authorized moderators; positive named-zone/JWT acceptance needs legitimate operator-approved source data. Disconnected PostgreSQL fixtures are labelled and never deployed as user data. The SQL delta is generated with the CLI, stored only under supabase/staging and applied only after isolated ACL/rollback tests and reconciliation; never replay existing migrations.

## Rollback and gates

Rollback disables the new public RPCs and makes every zone fail closed while retaining zone/member/message data and ordinary global/geographic chat. It must not drop privacy guards or delete real messages. Verify global chat, nonmember/member/departed/banned/closed-source cases, reactions/photos/read state, wrong actor/confirmation, direct private access, orphan/type change and rollback in isolated PostgreSQL. Genuine JWT/Realtime/hosted results are separate and remain BLOCKED until actual conditions exist. Realtime DELETE metadata and abuse/retention/presence guarantees require the later OSP-05/09 review; no blanket privacy acceptance.

## Actual implementation checkpoint

PR114, `f8eae65e7dd2b8572ece1d475ef43afe7c69a897`, tree `5d3517f5aa0bcfbce0e34aa957e48d85e17d0a43`. Stage schema is unchanged: the generated delta and non-destructive rollback are committed only under supabase/staging and not applied.19 isolated SQL tests,10 catalog component tests,6 captured-actor API regressions and the inaccessible-room/global fallback regression pass; full520 Vitest/45 files, TS/lint/build/route/migration audit PASS. Private-schema USAGE remains revoked: invoker read-summary checks the visible RLS-protected chat_places relation instead of resolving a private-schema function. Extra restrictive place write guards prevent client zone provisioning. No new zones/users/moderators were seeded. All future OSP gates remain mandatory P0.
