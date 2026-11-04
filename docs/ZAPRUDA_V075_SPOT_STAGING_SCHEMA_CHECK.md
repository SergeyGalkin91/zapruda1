# v0.7.5 SPOT — STAGING schema compatibility checkpoint
**03.11.2026 · READ-ONLY Supabase STAGING `yudtbifopfnjtjanaqrd` · not a migration**

## Observed schema (public)
- `profiles`: `id`, `username`, `display_name`, `avatar_url`, `bio`, `chat_city`, `avatar_symbol`; RLS ON.
- `fishing_reports`: `id`, `user_id`, `title`, `body`, `location_name`, `approximate_latitude/longitude`, legacy `latitude/longitude`, `water_type`, `weather_summary`, `is_public`, `fishing_method`; RLS ON. **No individual fish proof, verified mass or detailed species field observed**. Do not pretend existing reports are records.
- `competitions`: team competition with organizer, area_label, max_teams, scoring_mode, dates/status; RLS ON.
- `competition_results`: team_id, fish_count, total_weight_g, biggest_fish_g, submitted_by, status; RLS ON. **Not a verified one-fish catch system**; no proof records or territory constraints.
- `report_private_locations`: exists and RLS ON; separate GEO P0 #67 remains open.
- None of `spot_catches`, `spot_records`, `spot_titles`, `spot_notifications` were present in the table listing. No new tables were created.

## Integration design: avoid breaking existing tournaments
Keep current `competitions` and `competition_results` for existing team tournament behavior; do not delete or re-interpret `fish_count`, `total_weight_g`, or `biggest_fish_g`. These columns serve existing competitions, not the new KING leagues.

New SPOT should use its own distinct catch + moderation + ranking entities, optionally relate `fishing_reports.id` as an optional user-facing story. A single catch_id may be eligible for multiple title scopes, never duplicate a real fish.

Recommended new logical entities (NOT MIGRATED):
- `zc_waterbodies`, `zc_spots`, `zc_spot_approvals` (source/legal status and public bounded geometry);
- `zc_catches` with immutable owner/method/species/weight/length and trusted status; proof originals in private bucket and public EXIF-free derivatives;
- `zc_catch_scope_attestations` with private sealed geo and independently confirmed municipality/region (not derived merely from name of river);
- `zc_record_categories`, `zc_title_holders`, `zc_title_history`, `zc_title_events` with atomic winner replacement and unique scope key;
- `zc_record_subscriptions`, `zc_notification_outbox`, `zc_notifications`;
- `zc_moderation_cases`, `zc_appeals`, `zc_audit_events`.

No generic authenticated write to `status=verified`, `title_holders`, `geo_approved`, `notification_outbox`: privileged transitions must be server-authenticated and audit-logged. Avoid public SECURITY DEFINER routines; RLS on exposed tables and explicit grants if needed. Public read DTOs cannot expose exact GPS or private originals.

## Preconditions before implementation
1. Resolve GEO P0 #67 and exact/approximate public field strategy; verify API/SSR/EXIF leaks with real roles.
2. Confirm `profiles.id`/Auth FK and existing migration naming/dependency history; review actual SQL constraints, RLS and indexes.
3. Agree measurement protocol and fairness rules: method/gear validation; ties; season vs all-time; retroactive catch; micro welfare protections.
4. Review candidate SQL in isolated STAGING; test concurrent record submissions and rollback. Only then design any production migration.
5. Four confirmed STAGING test users, environment secrets and role-authenticated E2E required; current candidate does not establish PASS.

**Status:** read-only contract check; no SQL writes, no STAGING/PROD schema mutation, no deployment.
