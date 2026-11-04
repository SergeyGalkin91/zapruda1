# Grok development lane — ZAPRUDA COMMUNITY

This branch is reserved for Grok-assisted improvements to the feed, fishing report creation, UI responsiveness, and performance.

## Branch boundaries
- Work only on `grok/improvements` or `grok/*` feature branches.
- Never commit directly to `main` or `audit/ux-accessibility-2026-10-30`.
- Open a draft PR against `main` for review; do not merge automatically.
- Check PR #1 before touching shared components. That PR includes new achievements, GPS tracking, reviews, and Supabase work beyond UX.

## In scope
- Feed loading, pagination, rendering, accessibility.
- New fishing report flow and form validation.
- Performance improvements and tests.
- Isolated, documented bugs.

## Coordinate before editing
- Database schemas, migrations, RLS or authentication.
- Achievements, XP, reputation, GPS tracker, guides and payments.
- Shared navigation or global shell components.
- Any operation requiring secrets, elevated access, or destructive data changes.

## Required checks
1. Explain the change in the PR description and list affected screens.
2. Run project build, tests and lint; disclose pre-existing or remaining errors.
3. Test the happy path and error path; add tests where practical.
4. Keep changes small and reversible. Do not rewrite unrelated work.
5. Never commit `.env`, tokens, API secret keys or service-role credentials.

## Deployment
Do not touch the production Docker container or deploy without the project owner's approval.
