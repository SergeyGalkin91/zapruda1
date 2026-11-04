# STAGING global chat: applied and verified 2026-11-04

## Production safety
- Applied ONLY to Supabase STAGING `yudtbifopfnjtjanaqrd` via migration `staging_global_chat_insert_auth_20261104`.
- Production project `sonvniuwtvzzyuglscah`, main, DNS, Netlify and live user content unchanged.
- SQL patch is stored under `qa/staging/` rather than production automatic migrations.

## Bug fixed
The ZAPRUDA UI explicitly navigates to the global room `GLOBAL_ID=00000000-0000-4000-8000-000000000001`, but the original STAGING INSERT policy allowed only country/region/city. Global inserts were rejected.

Added one narrowly scoped **PERMISSIVE INSERT** policy for `place_id=GLOBAL_ID`, `place.level='global'` and `user_id=auth.uid()`. Crucially, the preexisting **RESTRICTIVE** policy `pilot_chat_confirmed_write` added by Work requires the actor in auth.users to have a confirmed email and not be anonymous; this policy remains active for the global room. Regional posting policy remains unchanged.

## Direct SQL verification
- Authenticated role with a real existing confirmed user's UUID impersonated using `request.jwt.claim.sub`: one global chat INSERT succeeds in a `BEGIN...ROLLBACK` transaction; no content persists.
- Unconfirmed user's UUID with authenticated role is denied under RESTRICTIVE pilot policy.
- `anon` has no `INSERT` privilege for chat messages.
- New global policy count = 1, old restrictive pilot policy count = 1.
- Post-test chat messages = 0.

**These are SQL role simulations, not signed-JWT/browser tests**. Do not claim full Auth or Realtime acceptance. Production privacy, Netlify STAGING URL and two genuine JWT sessions remain independent gates. Do not reapply the already-applied STAGING migration.
