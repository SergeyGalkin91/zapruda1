# ZAPRUDA SPINNING — project checkpoint

Checkpoint date: 2026-10-29

## Repository
- GitHub repository: https://github.com/SergeyGalkin91/zapruda1
- Default branch: `main`
- Repository visibility checked: public
- This document contains no credentials or environment secrets.

## Current known state
- App uses React 19, TanStack Start/Router, Vite 8, TypeScript, and Supabase.
- The app has previously been run locally in Docker as container `zaprud-app`, on `http://localhost:3000`, using local `env.local` for configuration.
- Supabase is hosted remotely; do not assume a local database exists.
- `.env` was removed from the GitHub working tree and ignore rules were added for `.env`, `.env.*`, and `env.local` (while allowing `.env.example`). Previously exposed real privileged secrets should be rotated; never commit secrets.
- Recent GitHub commits added demo UI for reactions, chat emoji/reactions, profile achievements, and emoji support in reports. These interfaces are currently demonstrations/local state and are not yet fully persisted/synchronized through Supabase.
- A draft SQL migration exists at `supabase/migrations/20261029000000_social_reactions_achievements.sql`. Do not apply it blindly: first compare it with the actual Supabase schema and existing data/policies.
- The current Supabase schema inspection query returned a result grid with four columns, but the exact table/column names have not yet been captured.

## Next steps
1. Inspect current `main` files and confirm latest commits before editing.
2. Safely identify the existing columns for `reports`, `comments`, `reactions`, and `profiles`; do not require screenshots if avoidable.
3. Review the draft migration against the real schema, existing rows, foreign keys, and RLS policies before applying anything.
4. Connect reactions to persistent Supabase data, then implement persistent chat and real achievements.
5. Revisit profile editing (the Edit button was previously missing/not saved in `src/routes/profile.tsx`).
6. Review the map attribution/flag issue and persistence of map points.
7. Test builds and Docker only after syncing the intended GitHub changes to the local checkout.

## Safety / workflow rules
- Never ask the user to paste passwords, API keys, or service-role secrets.
- Do not reinstall the project or change Supabase settings/schema without a reason and an explicit, reviewed plan.
- Keep GitHub `main`, the user's local folder (`C:\\Users\\Dell\\Downloads\\zaprud-main`), and the running Docker container distinct; commits in GitHub do not automatically update the local app or container.
- Work in small steps and avoid repeating commands unnecessarily.
