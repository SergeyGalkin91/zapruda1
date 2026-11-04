# STAGING feedback Edge Function deployment — 2026-11-04

## Applied
- **Only** Supabase STAGING project `yudtbifopfnjtjanaqrd`.
- Deployed `submit-community-request` Edge Function, version 1, status ACTIVE, `verify_jwt=true`.
- Code is version-controlled at `qa/staging/functions/submit-community-request/index.ts`; it is intentionally **not** in production function path.
- Derived from repository function, with two STAGING safeguards:
  1. Explicitly require `identity.user.email_confirmed_at` and reject anonymous users.
  2. **Disable all outbound Telegram requests** so test feedback cannot reach a production/admin chat.
- Keeps user-token `auth.getUser(token)` authentication, payload limits, existing hourly/daily rate checks (5 / hour, 15 / day), service-side insert into `community_requests` and response shape expected by `src/routes/feedback.tsx`.
- Database `community_requests` was already restored in STAGING via PR #106 and remains client INSERT-denied. No changes were made to production.

## Verification
- Live Supabase list / read of function confirmed name, ACTIVE v1, JWT verification enabled and deployed source contains the email confirmation guard and no Telegram HTTP URL.
- `community_requests` contains **0** saved rows; authenticated browser user still cannot INSERT directly.
- Attempted unauthenticated HTTP POST for gateway rejection; the execution environment could not resolve the Supabase hostname (DNS error). **No HTTP response obtained**. Thus positive end-to-end submission, access from actual browser, provider key secrets and signed-JWT authorization behavior remain **unverified**.
- No real user feedback was submitted; no Telegram notification sent.

## Release gates
- Test from actual STAGING URL as two users (verified, unverified) and guest; verified should create a request, guest/unverified rejected; inspect response/status and per-account history; clean up only designated QA fixture. Check runtime secrets (Supabase URL + publishable/service key) and function logs on any 503.
- Review deployment when integrating PR: this staging function intentionally differs from production Telegram-enabled version and **must never be copied to production without review**.
- Do not merge into `main` or run on prod automatically.
