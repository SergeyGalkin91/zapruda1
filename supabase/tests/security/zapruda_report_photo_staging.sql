-- STAGING only. SQL role/claim emulation, NOT real Auth JWT or Storage HTTP.
-- Uses two existing confirmed identities; creates no Auth users or binary objects.
-- All synthetic report/photo/Storage metadata is rolled back.
begin;
set local statement_timeout = '20s';
do $$
declare identities uuid[]; owner_id uuid; public_id uuid:=gen_random_uuid(); private_id uuid:=gen_random_uuid();
  raw_id uuid:=gen_random_uuid(); clean_id uuid:=gen_random_uuid(); private_photo_id uuid:=gen_random_uuid();
begin
  if not exists(select 1 from pg_policies where schemaname='storage' and policyname='Report derivatives server delete') then
    raise exception 'Apply both photo boundary migrations first';
  end if;
  select array_agg(id) into identities from (select id from auth.users where email_confirmed_at is not null order by id limit 2) u;
  if coalesce(array_length(identities,1),0)<>2 then raise exception 'Two confirmed staging identities required'; end if;
  owner_id:=identities[1];
  perform set_config('zapruda.qa.owner',owner_id::text,true);
  perform set_config('zapruda.qa.stranger',identities[2]::text,true);
  perform set_config('zapruda.qa.report',public_id::text,true);
  perform set_config('zapruda.qa.private',private_id::text,true);
  perform set_config('zapruda.qa.raw',raw_id::text,true);
  perform set_config('zapruda.qa.clean',clean_id::text,true);
  insert into public.fishing_reports(id,user_id,title,is_public) values
    (public_id,owner_id,'QA synthetic photo boundary -- ROLLBACK',true),
    (private_id,owner_id,'QA synthetic private report -- ROLLBACK',false);
  insert into public.report_photos(id,report_id,user_id,storage_path,sanitized_path,sanitized_at) values
    (raw_id,public_id,owner_id,owner_id||'/'||public_id||'/'||raw_id||'.jpg',null,null),
    (clean_id,public_id,owner_id,owner_id||'/'||public_id||'/'||clean_id||'.jpg',owner_id||'/'||public_id||'/'||clean_id||'.jpg',now()),
    (private_photo_id,private_id,owner_id,owner_id||'/'||private_id||'/'||private_photo_id||'.jpg',owner_id||'/'||private_id||'/'||private_photo_id||'.jpg',now());
  insert into storage.buckets(id,name,public) values('report-photos','report-photos',false) on conflict(id) do nothing;
  insert into storage.objects(bucket_id,name) values
    ('report-photos',owner_id||'/'||public_id||'/'||raw_id||'.jpg'),
    ('report-photo-derivatives',owner_id||'/'||public_id||'/'||clean_id||'.jpg'),
    ('report-photo-derivatives',owner_id||'/'||private_id||'/'||private_photo_id||'.jpg');
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$
begin
  if (select count(*) from public.report_photos where report_id in (current_setting('zapruda.qa.report')::uuid,current_setting('zapruda.qa.private')::uuid))<>1 then raise exception 'Guest photo metadata boundary failed'; end if;
  if (select count(*) from storage.objects where name like current_setting('zapruda.qa.owner')||'/'||current_setting('zapruda.qa.report')||'/%')<>1 then raise exception 'Guest original Storage boundary failed'; end if;
  if exists(select 1 from storage.objects where name like current_setting('zapruda.qa.owner')||'/'||current_setting('zapruda.qa.private')||'/%') then raise exception 'Guest private derivative boundary failed'; end if;
  if exists(select 1 from public.fishing_reports where id=current_setting('zapruda.qa.report')::uuid and (latitude is not null or longitude is not null)) then raise exception 'Public exact GPS is not null'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('zapruda.qa.stranger'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  delete from public.report_photos where report_id=current_setting('zapruda.qa.report')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Stranger can delete metadata'; end if;
  update storage.objects set name=current_setting('zapruda.qa.stranger')||'/stolen.jpg'
    where name like current_setting('zapruda.qa.owner')||'/'||current_setting('zapruda.qa.report')||'/%';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Stranger can rename objects'; end if;
  -- Hosted Storage rejects direct SQL DELETE independently of RLS.
  -- Do not disable that guard; deletion needs a real Storage API/JWT test.
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('zapruda.qa.owner'),'role','authenticated')::text,true);
do $$
declare affected integer;
begin
  if (select count(*) from public.report_photos where report_id in (current_setting('zapruda.qa.report')::uuid,current_setting('zapruda.qa.private')::uuid))<>3 then raise exception 'Owner metadata access failed'; end if;
  if (select count(*) from storage.objects where name like current_setting('zapruda.qa.owner')||'/'||current_setting('zapruda.qa.report')||'/%')<>2 then raise exception 'Owner original access failed'; end if;
  begin
    update public.report_photos set sanitized_path=storage_path,sanitized_at=now() where id=current_setting('zapruda.qa.raw')::uuid;
    raise exception 'Browser can forge sanitization marker';
  exception when insufficient_privilege then null; end;
  begin
    update public.fishing_reports set latitude=1.234567,longitude=4.567891 where id=current_setting('zapruda.qa.report')::uuid;
    raise exception 'Legacy public exact coordinate write accepted';
  exception when check_violation then null; end;
  update public.fishing_reports set is_public=false where id=current_setting('zapruda.qa.report')::uuid;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Owner publication update failed'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$
begin
  if exists(select 1 from public.report_photos where report_id=current_setting('zapruda.qa.report')::uuid) then raise exception 'New metadata access survived publication revoke'; end if;
  if exists(select 1 from storage.objects where name like current_setting('zapruda.qa.owner')||'/'||current_setting('zapruda.qa.report')||'/%') then raise exception 'New Storage access survived publication revoke'; end if;
end $$;
reset role;
rollback;
select 'PASS: hosted SQL role/claim photo boundary; all fixtures rolled back; real JWT/Storage HTTP not tested' as result;
