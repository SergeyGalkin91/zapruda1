-- ZAPRUDA COMMUNITY v0.7.1 / #67
-- Staging-only geo/RLS regression tests. PostgreSQL role/JWT emulation, NOT real Auth API E2E.
-- Run: psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/security/zapruda_geo_rls_staging.sql
-- Preconditions: a STAGING report with a valid user_id; no public.zapruda_admins in STAGING.
-- All fixtures are synthetic coordinates and are rolled back.
-- Do NOT run against production; no schema changes or lasting data are intended.
BEGIN;
SET LOCAL statement_timeout = '20s';

SELECT set_config('zc_test.owner', (SELECT user_id::text FROM public.fishing_reports ORDER BY created_at LIMIT 1), true);
SELECT set_config('zc_test.stranger', '00000000-0000-4000-8000-0000000000a2', true);
SELECT set_config('zc_test.pub', gen_random_uuid()::text, true);
SELECT set_config('zc_test.priv', gen_random_uuid()::text, true);

DO $check$
BEGIN
  IF nullif(current_setting('zc_test.owner', true),'') IS NULL THEN
    RAISE EXCEPTION 'fixture: no existing STAGING owner; abort';
  END IF;
  IF to_regclass('public.zapruda_admins') IS NOT NULL THEN
    RAISE EXCEPTION 'fixture: admin membership schema changed; adjust admin test before running';
  END IF;
END $check$;

INSERT INTO public.fishing_reports (id,user_id,title,is_public,body)
VALUES
(current_setting('zc_test.pub')::uuid,current_setting('zc_test.owner')::uuid,'__ZC_GEO_RLS_PUBLIC_FIXTURE__',true,'TEST ONLY'),
(current_setting('zc_test.priv')::uuid,current_setting('zc_test.owner')::uuid,'__ZC_GEO_RLS_PRIVATE_FIXTURE__',false,'TEST ONLY');

INSERT INTO public.report_private_locations (report_id,user_id,latitude,longitude)
VALUES
(current_setting('zc_test.pub')::uuid,current_setting('zc_test.owner')::uuid,12.123456,23.123456),
(current_setting('zc_test.priv')::uuid,current_setting('zc_test.owner')::uuid,13.123456,24.123456);

-- Negative checks: forbid exact coordinates in public.fishing_reports.
DO $check$
BEGIN
  BEGIN
    INSERT INTO public.fishing_reports(user_id,title,is_public,latitude,longitude)
    VALUES (current_setting('zc_test.owner')::uuid, '__ZC_GEO_SHOULD_REJECT__', true, 12.123456, 23.123456);
    RAISE EXCEPTION 'FAIL exact GPS insertion accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.fishing_reports SET latitude=12.123456,longitude=23.123456
    WHERE id=current_setting('zc_test.pub')::uuid;
    RAISE EXCEPTION 'FAIL exact GPS update accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $check$;

-- CASE 1. Guest / anon: public report only; no private table grant.
SET LOCAL ROLE anon;
DO $check$
BEGIN
  IF (SELECT count(*) FROM public.fishing_reports WHERE id=current_setting('zc_test.pub')::uuid)<>1 THEN
    RAISE EXCEPTION 'FAIL guest public report';
  END IF;
  IF (SELECT count(*) FROM public.fishing_reports WHERE id=current_setting('zc_test.priv')::uuid)<>0 THEN
    RAISE EXCEPTION 'FAIL guest private report visible';
  END IF;
  IF (SELECT count(*) FROM public.fishing_reports WHERE id=current_setting('zc_test.pub')::uuid AND (latitude IS NOT NULL OR longitude IS NOT NULL))<>0 THEN
    RAISE EXCEPTION 'FAIL guest exact GPS non-null';
  END IF;
  IF has_table_privilege('anon','public.report_private_locations','SELECT') THEN
    RAISE EXCEPTION 'FAIL anon private table grant';
  END IF;
END $check$;
RESET ROLE;

-- CASE 2. Stranger: can see public, cannot see private GPS or change others' reports.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('zc_test.stranger'), true);
DO $check$
DECLARE affected integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM current_setting('zc_test.stranger')::uuid THEN RAISE EXCEPTION 'FAIL stranger JWT subject'; END IF;
  IF (SELECT count(*) FROM public.fishing_reports WHERE id=current_setting('zc_test.pub')::uuid)<>1 THEN RAISE EXCEPTION 'FAIL stranger public report'; END IF;
  IF (SELECT count(*) FROM public.fishing_reports WHERE id=current_setting('zc_test.priv')::uuid)<>0 THEN RAISE EXCEPTION 'FAIL stranger sees private report'; END IF;
  IF (SELECT count(*) FROM public.report_private_locations WHERE report_id IN(current_setting('zc_test.pub')::uuid,current_setting('zc_test.priv')::uuid))<>0 THEN RAISE EXCEPTION 'FAIL stranger sees private GPS'; END IF;
  UPDATE public.fishing_reports SET title='unauthorized change' WHERE id=current_setting('zc_test.pub')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'FAIL stranger updated owner report'; END IF;
END $check$;
RESET ROLE;

-- CASE 3. Owner: permitted to see both their reports and own private GPS.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('zc_test.owner'), true);
DO $check$
DECLARE affected integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM current_setting('zc_test.owner')::uuid THEN RAISE EXCEPTION 'FAIL owner JWT subject'; END IF;
  IF (SELECT count(*) FROM public.fishing_reports WHERE id IN(current_setting('zc_test.pub')::uuid,current_setting('zc_test.priv')::uuid))<>2 THEN RAISE EXCEPTION 'FAIL owner reports'; END IF;
  IF (SELECT count(*) FROM public.report_private_locations WHERE report_id IN(current_setting('zc_test.pub')::uuid,current_setting('zc_test.priv')::uuid))<>2 THEN RAISE EXCEPTION 'FAIL owner private GPS'; END IF;
  UPDATE public.fishing_reports SET title='__ZC_GEO_OWNER_UPDATE_OK__' WHERE id=current_setting('zc_test.pub')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'FAIL owner update'; END IF;
END $check$;
RESET ROLE;

-- CASE 4. Forged admin claim: fails closed. NOT a real authorized app admin E2E!
-- An actual administrator permission test is blocked until STAGING has admin schema/fixtures.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('zc_test.stranger'), true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('zc_test.stranger'),'role','authenticated','app_metadata',json_build_object('role','admin'))::text,true);
DO $check$
BEGIN
  IF (SELECT count(*) FROM public.fishing_reports WHERE id=current_setting('zc_test.priv')::uuid)<>0 THEN RAISE EXCEPTION 'FAIL spoofed admin sees private report'; END IF;
  IF (SELECT count(*) FROM public.report_private_locations WHERE report_id=current_setting('zc_test.pub')::uuid)<>0 THEN RAISE EXCEPTION 'FAIL spoofed admin sees private GPS'; END IF;
END $check$;
RESET ROLE;

ROLLBACK;
SELECT 'PASS: guest/stranger/owner + spoofed admin RLS assertions; all fixture changes rolled back' AS result;
