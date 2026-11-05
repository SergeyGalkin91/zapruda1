# P0 E2E — exact failure and correction, 05.11.2026

Source: run41941541992, attempt2, job127009672225 on8777e4f. Safe artifact13382818204, cleanup=true. Raw authenticated screenshots are retained privately in GitHub; no credentials or private coordinates are copied here.

## Root cause

The authenticated browser matrix selected `getByRole("button", {name:/^Matte Black/})` globally. Settings intentionally contains two different buttons: the app color theme in `section[aria-labelledby="app-background-title"]` and the independent wallpaper in `section[aria-labelledby="wallpaper-title"]`. Playwright's strict-mode violation stopped the matrix before its first route screenshot. The initial curl connection-refused line was normal server startup and was not the fatal error.

## Preserved real evidence from the failed run

Four confirmed JWTs, own-progress API, hostile Origin/guest/foreign identity/unauthorized review and rejected-upload checks PASS. The actual signed-in UI passed report/catch persistence and lost-response retry, explicit one-fish transfer to BIG FISH, reload, authoritative empty-title profile, outsider isolation, chat Realtime/read state and STREET import. Cleanup=true. This is scoped partial evidence from a FAILURE workflow, not whole-workflow PASS and not a genuine positive KING award.

## Correction

A shared `appThemeButton` scopes the choice to the existing semantic theme section. The authenticated test asserts exactly one button, waits for hydration, verifies aria-pressed and the selected theme, and asserts that choosing a theme does not change the independent wallpaper. Guest browser suites use the same scoped locator instead of `.first()`. The real Settings hydration regression explicitly retains both identically named controls and changes each preference independently. No checks, routes, engines, widths, themes, privacy constraints or cleanup are removed. Matrix failures now include engine/width/theme/route metadata.

Local: TypeScript, lint (0 errors,6 existing warnings),484 Vitest tests/42 files and syntax checks PASS. Build and actual GitHub exact-SHA evidence are recorded in canonical PR111 after verification. Full protected run remains necessary.

## Genuine KING boundary

STAGING currently has0 independently authorized moderators,0 approved/reviewed lawful SPOT and0 accepted SPOT catches. No public catch, SPOT or role is fabricated. Real submission → independent approval → awarded KING → profile remains BLOCKED until those legitimate conditions exist. The matrix can prove the actual navigation and authoritative server progress without pretending that an empty profile is an awarded title.

No main, Production, version, tag, published release, DNS, payments or provider quotas are changed. ON SPOT+ work continues separately under the full OSP-01…09 contract.
