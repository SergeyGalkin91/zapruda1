# Client dependency matrix — 04.11.2026

STAGING snapshot: **2026-11-04 01:07:53.225628+00**, 45 public base tables. Production metadata: 2026-11-04 00:42:29.615619+00. Comparison covered columns/types/nullability/defaults, PK/FK/CHECK/UNIQUE, indexes, RLS, table/column ACL and RPC signatures/search_path/security. Storage and deployed Edge sources were independently inspected. No production user records, keys, private coordinates or originals were read/copied.

This is structural inventory, **not** signed-JWT acceptance. Ongoing subsequent STAGING changes must be preserved and rechecked before another deployment.

| Relation                          | STAGING / PROD columns | RLS / invoker view | Constraints / policies | State                            |
| --------------------------------- | ---------------------: | ------------------ | ---------------------: | -------------------------------- |
| `ai_daily_advices`                |                 13 / 9 | True               |                  9 / 1 | column deltas below              |
| `ai_memberships`                  |                  0 / 4 | absent             |                  0 / 0 | MISSING                          |
| `angler_gear`                     |                  9 / 9 | True               |                  7 / 6 | present; JWT acceptance separate |
| `angler_gear_sets`                |                11 / 11 | True               |                  9 / 6 | present; JWT acceptance separate |
| `angler_preferences`              |                15 / 15 | True               |                  2 / 1 | present; JWT acceptance separate |
| `atlas_catch_claims`              |                 0 / 10 | absent             |                  0 / 0 | MISSING                          |
| `atlas_fish_species`              |                  0 / 4 | absent             |                  0 / 0 | MISSING                          |
| `atlas_waterbodies`               |                 0 / 10 | absent             |                  0 / 0 | MISSING                          |
| `atlas_waterbody_species`         |                  0 / 4 | absent             |                  0 / 0 | MISSING                          |
| `beta_test_applications`          |                  4 / 4 | True               |                  3 / 2 | present; JWT acceptance separate |
| `catches`                         |                10 / 10 | True               |                  7 / 3 | present; JWT acceptance separate |
| `chat_message_photos`             |                  7 / 5 | True               |                  8 / 1 | column deltas below              |
| `chat_message_reactions`          |                  4 / 4 | True               |                  5 / 4 | present; JWT acceptance separate |
| `chat_messages`                   |                  7 / 7 | True               |                  7 / 5 | present; JWT acceptance separate |
| `chat_places`                     |                  7 / 7 | True               |                  7 / 1 | present; JWT acceptance separate |
| `club_creation_requests`          |                11 / 11 | True               |                  4 / 2 | present; JWT acceptance separate |
| `comments`                        |                  5 / 5 | True               |                  5 / 3 | present; JWT acceptance separate |
| `community_requests`              |                12 / 12 | True               |                 10 / 1 | present; JWT acceptance separate |
| `competitions`                    |                 11 / 0 | True               |                  9 / 3 | present; JWT acceptance separate |
| `fishing_reports`                 |                18 / 18 | True               |                  5 / 5 | present; JWT acceptance separate |
| `follows`                         |                  3 / 3 | True               |                  4 / 3 | present; JWT acceptance separate |
| `guide_booking_inquiries`         |                 0 / 18 | absent             |                  0 / 0 | MISSING                          |
| `guide_booking_quotes`            |                13 / 11 | True               |                 10 / 1 | column deltas below              |
| `guide_profiles`                  |                17 / 23 | True               |                 13 / 3 | column deltas below              |
| `guide_verification_applications` |                 0 / 10 | absent             |                  0 / 0 | MISSING                          |
| `guide_verifications`             |                  4 / 4 | True               |                  2 / 0 | present; JWT acceptance separate |
| `meetup_members`                  |                  5 / 0 | True               |                  5 / 3 | present; JWT acceptance separate |
| `meetup_messages`                 |                  5 / 0 | True               |                  4 / 2 | present; JWT acceptance separate |
| `meetup_posts`                    |                  9 / 0 | True               |                  8 / 3 | present; JWT acceptance separate |
| `meetup_private_details`          |                  6 / 0 | True               |                  6 / 3 | present; JWT acceptance separate |
| `my_activity_badges`              |                  8 / 8 | invoker            |                  0 / 0 | present; JWT acceptance separate |
| `my_atlas_progress`               |                  0 / 6 | absent             |                  0 / 0 | MISSING                          |
| `partner_trip_messages`           |                  5 / 5 | True               |                  4 / 2 | present; JWT acceptance separate |
| `partner_trip_requests`           |                  6 / 6 | True               |                  5 / 3 | present; JWT acceptance separate |
| `partner_trips`                   |                36 / 36 | True               |                 13 / 3 | present; JWT acceptance separate |
| `private_fishing_marks`           |                  8 / 8 | True               |                  7 / 1 | present; JWT acceptance separate |
| `profiles`                        |                  8 / 8 | True               |                  3 / 3 | present; JWT acceptance separate |
| `reactions`                       |                  5 / 5 | True               |                  4 / 4 | present; JWT acceptance separate |
| `report_photos`                   |                  8 / 6 | True               |                  8 / 4 | column deltas below              |
| `social_group_members`            |                  6 / 6 | True               |                  5 / 5 | present; JWT acceptance separate |
| `social_group_messages`           |                  5 / 5 | True               |                  4 / 2 | present; JWT acceptance separate |
| `social_groups`                   |                  9 / 9 | True               |                  4 / 1 | present; JWT acceptance separate |
| `social_messages`                 |                11 / 11 | True               |                  7 / 2 | present; JWT acceptance separate |
| `social_threads`                  |                  6 / 6 | True               |                  6 / 3 | present; JWT acceptance separate |
| `spearfishing_profiles`           |                 0 / 12 | absent             |                  0 / 0 | MISSING                          |
| `user_activity_windows`           |                  2 / 2 | True               |                  2 / 2 | present; JWT acceptance separate |
| `zapruda_admins`                  |                  2 / 2 | True               |                  2 / 1 | present; JWT acceptance separate |
| `zc_public_spots`                 |                 11 / 0 | True               |                  7 / 1 | present; JWT acceptance separate |

## Missing dependencies at the snapshot

9 relations: `ai_memberships`, `atlas_catch_claims`, `atlas_fish_species`, `atlas_waterbodies`, `atlas_waterbody_species`, `guide_booking_inquiries`, `guide_verification_applications`, `my_atlas_progress`, `spearfishing_profiles`.

The count includes `my_atlas_progress` view, not an additional base table. Missing tables: 8.

## Existing-relation column differences

- `ai_daily_advices`: `attempts`, `attempts`, `error_message`, `lease_expires_at`, `lease_token`, `model`.
- `chat_message_photos`: `sanitized_at`, `sanitized_path`.
- `guide_booking_quotes`: `contacts_unlocked_at`, `provider_payment_id`.
- `guide_profiles`: `live_sonar_model`, `live_sonar_system`, `meeting_area`, `meeting_lat`, `meeting_lon`, `service_mode`.
- `report_photos`: `sanitized_at`, `sanitized_path`.

Trust markers in report/chat photos and safer AI lease schema are intentional STAGING protections. Do not remove them to match older production. Exact guide meeting coordinates, payment unlocks and legacy media migration need their own review. The seven partner_trips matching columns are now present with verified defaults/CHECKs.

## Missing client RPCs

- `accept_guide_quote` — `src/components/GuideBookings.tsx`.
- `admin_finance_summary` — `src/routes/finance.tsx`.
- `cancel_guide_booking` — `src/components/GuideBookings.tsx`.
- `confirm_club_creation_payment` — `src/routes/moderation.tsx`.
- `quote_guide_booking` — `src/components/GuideBookings.tsx`.
- `review_guide_application` — `src/routes/moderation.tsx`.

## Subsequent changes retained

20261104004040 adds confirmed own global-room sending alongside existing geography restrictions. 20261104005024 adds an **empty** owner-readable admin membership lookup with no API role assignment. 20261104005501 adds own follows writes and an intentionally signed-in-readable social graph. 20261104010044 adds owner-only safe feedback read columns; body/contact/direct writes remain closed. Submission broker v2 is now deployed only in STAGING, JWT-protected and without Telegram; see the acceptance update below. These migrations were read back, not replayed. Isolated regression fixtures cover their boundaries; no new live-JWT PASS is inferred.

Rollback now refuses the subsequent global policy even on an empty DB, because deleting the confirmed-write guard would change its security contract. A disposable captured pre-subsequent clone still verifies empty rollback/reapply and refusal to discard content. Use a newly reviewed forward plan for the current hosted schema.

## Acceptance boundary

Core report/catch/comment, geographic chat/media, own gear/marks/profile are structurally aligned. Signed-JWT/API/Realtime remains protected-run evidence only. Full KING requires an owner-authorized independent moderator, legal real spot and genuine evidence. Admin/guide/payment/Atlas/spearfishing and feedback submission are not declared pilot-ready by a metadata table count.

## Acceptance update — 04.11.2026 02:23 UTC

Inventory remains **45 public tables/all RLS**, 8 absent tables + Atlas view + 6 client RPCs. No Atlas draft/guide/payment schema was applied. **20261104021404 v075_feedback_atomic_limits** adds a server-only invoker RPC and SELECT(user_id) to the own-row feedback contract, preserving closed body/contact and direct-write denial. This is not a new client RPC dependency or a production delta.

[Run41759969230/source8273912](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41759969230): genuine core report/catch/privacy/chat/media/Realtime/profile/gear/weather and feedback v2 PASS; exact fixture cleanup independently confirmed. Current four-account run does not prove unconfirmed/live KING/hosted Netlify browser/Atlas/paid guide flows. Source #101 profile fix adopted without extending bio privileges. #105 independently reviewed but not applied; missing progress view, confirmed actor and sanitized evidence contracts need their own tests. [Full acceptance](ZAPRUDA_STAGING_JWT_ACCEPTANCE_20261104.md).
