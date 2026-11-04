# Client dependency matrix — 04.11.2026

Read-only metadata: STAGING 2026-11-04 00:40:49.481933+00; production 2026-11-04 00:42:29.615619+00. No user rows, private coordinates, keys, passwords or original images were read. Detailed schema snapshots were compared locally: column types/nullability/defaults, PK/FK/CHECK/UNIQUE, indexes, RLS, table/column ACL and RPC signatures/security/search_path. Storage and new Edge source readback are recorded in the alignment report.

Counts are structural inventory, **not** functional/JWT acceptance. Absent optional/admin/payment dependencies are not replaced with permissive stubs.

| Relation                          | STAGING / PROD columns | RLS   | Constraints / policies (STAGING) | State                                 |
| --------------------------------- | ---------------------: | ----- | -------------------------------: | ------------------------------------- |
| `ai_daily_advices`                |                 13 / 9 | True  |                            9 / 1 | column deltas require separate review |
| `ai_memberships`                  |                  0 / 4 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `angler_gear`                     |                  9 / 9 | True  |                            7 / 6 | present; acceptance gate separate     |
| `angler_gear_sets`                |                11 / 11 | True  |                            9 / 6 | present; acceptance gate separate     |
| `angler_preferences`              |                15 / 15 | True  |                            2 / 1 | present; acceptance gate separate     |
| `atlas_catch_claims`              |                 0 / 10 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `atlas_fish_species`              |                  0 / 4 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `atlas_waterbodies`               |                 0 / 10 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `atlas_waterbody_species`         |                  0 / 4 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `beta_test_applications`          |                  4 / 4 | True  |                            3 / 2 | present; acceptance gate separate     |
| `catches`                         |                10 / 10 | True  |                            7 / 3 | present; acceptance gate separate     |
| `chat_message_photos`             |                  7 / 5 | True  |                            8 / 1 | column deltas require separate review |
| `chat_message_reactions`          |                  4 / 4 | True  |                            5 / 4 | present; acceptance gate separate     |
| `chat_messages`                   |                  7 / 7 | True  |                            7 / 5 | present; acceptance gate separate     |
| `chat_places`                     |                  7 / 7 | True  |                            7 / 1 | present; acceptance gate separate     |
| `club_creation_requests`          |                11 / 11 | True  |                            4 / 2 | present; acceptance gate separate     |
| `comments`                        |                  5 / 5 | True  |                            5 / 3 | present; acceptance gate separate     |
| `community_requests`              |                 0 / 12 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `competitions`                    |                 11 / 0 | True  |                            9 / 3 | present; acceptance gate separate     |
| `fishing_reports`                 |                18 / 18 | True  |                            5 / 5 | present; acceptance gate separate     |
| `follows`                         |                  0 / 3 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `guide_booking_inquiries`         |                 0 / 18 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `guide_booking_quotes`            |                13 / 11 | True  |                           10 / 1 | column deltas require separate review |
| `guide_profiles`                  |                17 / 23 | True  |                           13 / 3 | column deltas require separate review |
| `guide_verification_applications` |                 0 / 10 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `guide_verifications`             |                  4 / 4 | True  |                            2 / 0 | present; acceptance gate separate     |
| `meetup_members`                  |                  5 / 0 | True  |                            5 / 3 | present; acceptance gate separate     |
| `meetup_messages`                 |                  5 / 0 | True  |                            4 / 2 | present; acceptance gate separate     |
| `meetup_posts`                    |                  9 / 0 | True  |                            8 / 3 | present; acceptance gate separate     |
| `meetup_private_details`          |                  6 / 0 | True  |                            6 / 3 | present; acceptance gate separate     |
| `my_activity_badges`              |                  8 / 8 | False |                            0 / 0 | present; acceptance gate separate     |
| `my_atlas_progress`               |                  0 / 6 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `partner_trip_messages`           |                  5 / 5 | True  |                            4 / 2 | present; acceptance gate separate     |
| `partner_trip_requests`           |                  6 / 6 | True  |                            5 / 3 | present; acceptance gate separate     |
| `partner_trips`                   |                29 / 36 | True  |                            7 / 3 | column deltas require separate review |
| `private_fishing_marks`           |                  8 / 8 | True  |                            7 / 1 | present; acceptance gate separate     |
| `profiles`                        |                  8 / 8 | True  |                            3 / 3 | present; acceptance gate separate     |
| `reactions`                       |                  5 / 5 | True  |                            4 / 4 | present; acceptance gate separate     |
| `report_photos`                   |                  8 / 6 | True  |                            8 / 4 | column deltas require separate review |
| `social_group_members`            |                  6 / 6 | True  |                            5 / 5 | present; acceptance gate separate     |
| `social_group_messages`           |                  5 / 5 | True  |                            4 / 2 | present; acceptance gate separate     |
| `social_groups`                   |                  9 / 9 | True  |                            4 / 1 | present; acceptance gate separate     |
| `social_messages`                 |                11 / 11 | True  |                            7 / 2 | present; acceptance gate separate     |
| `social_threads`                  |                  6 / 6 | True  |                            6 / 3 | present; acceptance gate separate     |
| `spearfishing_profiles`           |                 0 / 12 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `user_activity_windows`           |                  2 / 2 | True  |                            2 / 2 | present; acceptance gate separate     |
| `zapruda_admins`                  |                  0 / 2 | None  |                            0 / 0 | MISSING IN STAGING                    |
| `zc_public_spots`                 |                 11 / 0 | True  |                            7 / 1 | present; acceptance gate separate     |

## Column contract differences in existing relations

- `ai_daily_advices`: `attempts`, `attempts`, `error_message`, `lease_expires_at`, `lease_token`, `model`.
- `chat_message_photos`: `sanitized_at`, `sanitized_path`.
- `guide_booking_quotes`: `contacts_unlocked_at`, `provider_payment_id`.
- `guide_profiles`: `live_sonar_model`, `live_sonar_system`, `meeting_area`, `meeting_lat`, `meeting_lon`, `service_mode`.
- `partner_trips`: seven audited missing matching fields were subsequently added by 20261104004812, with defaults/CHECKs read back. The pre-delta matrix row above is superseded for those columns.
- `report_photos`: `sanitized_at`, `sanitized_path`.

`chat_message_photos.sanitized_path/sanitized_at` are intentional STAGING trust markers. Legacy production original-photo policies and older AI schema remain separate P0 migration gates; do not remove the safer STAGING boundary to match production.

## Missing client RPCs

- `accept_guide_quote` — `src/components/GuideBookings.tsx`.
- `admin_finance_summary` — `src/routes/finance.tsx`.
- `cancel_guide_booking` — `src/components/GuideBookings.tsx`.
- `confirm_club_creation_payment` — `src/routes/moderation.tsx`.
- `quote_guide_booking` — `src/components/GuideBookings.tsx`.
- `review_guide_application` — `src/routes/moderation.tsx`.

These concern admin/guide/payment surfaces and are not enabled by this pilot schema work. No paid transaction, admin appointment or provider settlement was executed.

## Scope and evidence

Core report/catch/comment, geographic chat/media, own gear/marks/profile dependencies are aligned by ordered STAGING deltas. Signed-JWT/realtime transport requires a successful protected run. Guest browser screenshots and isolated SQL identities are kept distinct from actual hosted account evidence. Full KING requires the authorized moderator, legal spot and genuine evidence.

## Post-audit targeted completion

20261104004812 adds the seven partner_trips matching fields; current field counts now match for that relation, without altering existing RLS or payment guards. Its original row above records the metadata audit time before that delta. No exact guide meeting coordinates were added: guide/paid columns remain deferred. Production was metadata-read-only throughout.
