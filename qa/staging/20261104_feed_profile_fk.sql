-- STAGING-only hotfix for Netlify Deploy Preview #93 feed embeds.
-- Existing FK fishing_reports.user_id -> auth.users(id) is intentionally retained.
-- Production has FK fishing_reports.user_id -> profiles(id) and PostgREST
-- needs a relationship to resolve profiles(username,display_name,avatar_url).
-- Reviewed precondition: no staging report without a matching profile.
-- Keep profiles column grants and RLS unchanged.
ALTER TABLE public.fishing_reports
  ADD CONSTRAINT fishing_reports_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Invalidate PostgREST relationship cache immediately after FK creation.
NOTIFY pgrst, 'reload schema';
