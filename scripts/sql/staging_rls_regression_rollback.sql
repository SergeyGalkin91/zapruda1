-- ZAPRUDA STAGING ONLY. Run as privileged SQL editor, never against production.
-- Simulates two distinct authenticated subjects; this is NOT a real-JWT test.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  outsider_id uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  report_id uuid;
  n integer;
  constraint_blocked boolean := false;
BEGIN
  SELECT id INTO owner_id FROM auth.users WHERE email_confirmed_at IS NOT NULL LIMIT 1;
  IF owner_id IS NULL OR owner_id = outsider_id THEN
    RAISE EXCEPTION 'Missing valid STAGING account for test';
  END IF;
  IF has_column_privilege('anon','public.profiles','bio','SELECT') THEN
    RAISE EXCEPTION 'Anonymous biography leak';
  END IF;
  IF has_column_privilege('authenticated','public.profiles','bio','SELECT') THEN
    RAISE EXCEPTION 'Member biography leak';
  END IF;
  IF NOT has_column_privilege('anon','public.profiles','username','SELECT') THEN
    RAISE EXCEPTION 'Public identity inaccessible';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.my_profile_full();
  IF n <> 1 THEN RAISE EXCEPTION 'Owner RPC returned % rows', n; END IF;
  INSERT INTO public.fishing_reports(user_id,title,is_public,approximate_latitude,approximate_longitude)
  VALUES(owner_id,'TEMP_RLS_REGRESSION_ROLLBACK',false,56.326901,44.005999)
  RETURNING id INTO report_id;
  SELECT count(*) INTO n FROM public.fishing_reports
  WHERE id=report_id AND approximate_latitude=56.33 AND approximate_longitude=44.01;
  IF n <> 1 THEN RAISE EXCEPTION 'Approximate rounding failed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',outsider_id::text,true);
  SELECT count(*) INTO n FROM public.my_profile_full();
  IF n <> 0 THEN RAISE EXCEPTION 'Foreign user can read owner RPC'; END IF;
  SELECT count(*) INTO n FROM public.fishing_reports WHERE id=report_id;
  IF n <> 0 THEN RAISE EXCEPTION 'Foreign private report visible'; END IF;
  UPDATE public.fishing_reports SET title='FOREIGN_EDIT' WHERE id=report_id;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Foreign user can modify report'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  BEGIN
    UPDATE public.fishing_reports SET is_public=true,latitude=56.3,longitude=44 WHERE id=report_id;
  EXCEPTION WHEN check_violation THEN
    constraint_blocked := true;
  END;
  IF NOT constraint_blocked THEN RAISE EXCEPTION 'Precise public coordinates accepted'; END IF;
  UPDATE public.fishing_reports SET is_public=true,latitude=NULL,longitude=NULL WHERE id=report_id;
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO n FROM public.fishing_reports WHERE id=report_id;
  IF n <> 1 THEN RAISE EXCEPTION 'Public report not visible to anon'; END IF;
  RAISE NOTICE 'PASS: simulated owner/foreign isolation, profile RPC, coordinate protection, anonymous public report';
END $$;
ROLLBACK;
