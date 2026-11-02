-- STAGING ONLY: manual cleanup of a disposable real-JWT E2E fixture.
-- Supply an exact known QA group UUID from GitHub environment variables.
-- DO NOT run with a production group or without reviewing the read-only preview.
-- Keep the QA owner/account; this script removes only the known QA club and its messages.
-- This destroys the disposable group, so run only AFTER confirming its unique QA name.
BEGIN;
DO $$
DECLARE fixture_id uuid := nullif(current_setting('zapruda.qa_club_id', true),'')::uuid;
        fixture_name text; fixture_owner uuid;
BEGIN
 IF fixture_id IS NULL THEN
   RAISE EXCEPTION 'Set LOCAL zapruda.qa_club_id to the exact disposable group UUID first';
 END IF;
 SELECT name,owner_id INTO fixture_name,fixture_owner FROM public.social_groups WHERE id=fixture_id FOR UPDATE;
 IF NOT FOUND OR fixture_name !~ '^QA_E2E_STAGING_' THEN
   RAISE EXCEPTION 'Refusing to delete group with non-QA name or missing group';
 END IF;
 DELETE FROM public.social_group_messages WHERE group_id=fixture_id;
 DELETE FROM public.social_group_members WHERE group_id=fixture_id;
 DELETE FROM public.social_groups WHERE id=fixture_id;
 RAISE NOTICE 'QA group cleaned: %',fixture_id;
END $$;
COMMIT;
-- Run a separate SELECT afterward to verify group_id no longer exists.
