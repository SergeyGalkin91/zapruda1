# Netlify Preview to Supabase STAGING isolation QA — 2026-11-02

## Discovery
The previously generated `src/integrations/supabase/client.ts` defaulted to PROD Supabase URL/key if `VITE_SUPABASE_*` and `SUPABASE_*` environment variables were missing. A successful Netlify build does not prove that the preview targets STAGING. This was a data safety risk for preview testing.

## Change on PR #54
Added explicit browser detection for hosts matching `deploy-preview-<number>--zapruda1.netlify.app`, and Netlify server detection when `CONTEXT=deploy-preview`. For matching preview contexts, client is pinned to `yudtbifopfnjtjanaqrd.supabase.co` and its **public** `sb_publishable_` key. No service-role/secret key embedded. PROD default for non-preview contexts is unchanged.

## Verification status
- Source configuration guard checked in GitHub branch; checks in progress at authoring.
- Netlify build/deploy state should be confirmed at exact new head commit.
- Not verified by live browser traffic inspection or real user JWT: confirm browser DevTools Network makes requests to STAGING only, especially Auth and REST.
- Preview custom domains and Lovable previews are **not** covered by this Netlify hostname rule; configure equivalent isolation or refuse test logins there until verified.
- SSR validation requires runtime `CONTEXT` visibility. Audit Netlify deploy environment rather than assuming runtime shares build variables.

## Other release gates
Real payment collection not connected; club creation restricted to verified server action and fictional paid status used only in rollback SQL tests. No direct PROD changes or main merge.
