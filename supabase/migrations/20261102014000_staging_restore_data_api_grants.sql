-- STAGING corrective privileges for existing owner-scoped RLS policies.
-- GRANT controls Data API table availability; RLS still controls row access.
-- Reports: published rows may be read anonymously, while the owner can create/update own rows.
GRANT SELECT ON TABLE public.fishing_reports TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.fishing_reports TO authenticated;
-- Profiles: username / display name / avatar public; updates are owner-only via RLS.
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
