-- STAGING: avoid exposing private profile metadata to unauthenticated visitors.
-- Public identity fields only; authenticated role retains its current grants pending
-- a separate decision on member-to-member privacy and RLS/view design.
REVOKE SELECT ON TABLE public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url) ON TABLE public.profiles TO anon;
