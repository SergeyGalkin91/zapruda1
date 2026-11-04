-- Separate private derivative bucket. Legacy originals remain owner-only.
-- Existing photos are NOT marked safe by this migration: process them first.
create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fishing_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0 check (sort_order between 0 and 20),
  created_at timestamptz not null default now(),
  constraint report_photos_path_format check (
    storage_path = user_id::text || '/' || report_id::text || '/' || split_part(storage_path, '/', 3)),
  constraint report_photos_no_extra_folders check (
    array_length(string_to_array(storage_path, '/'), 1) = 3)
);
alter table public.report_photos add column if not exists sanitized_path text;
alter table public.report_photos add column if not exists sanitized_at timestamptz;
alter table public.report_photos drop constraint if exists report_photos_sanitized_path;
alter table public.report_photos add constraint report_photos_sanitized_path check (
  (sanitized_path is null and sanitized_at is null)
  or (sanitized_path is not null and sanitized_at is not null and
    sanitized_path = user_id::text || '/' || report_id::text || '/' || id::text || '.jpg'
    and storage_path = sanitized_path)
);
create index if not exists report_photos_report_order_idx
  on public.report_photos(report_id, sort_order, created_at);
alter table public.report_photos enable row level security;
revoke all on public.report_photos from public, anon, authenticated;
grant select on public.report_photos to anon, authenticated;
grant delete on public.report_photos to authenticated;
grant all on public.report_photos to service_role;

drop policy if exists "Read photos of public or own reports" on public.report_photos;
drop policy if exists "Add photos to own reports" on public.report_photos;
drop policy if exists "Delete photos from own reports" on public.report_photos;
drop policy if exists "Photo visibility boundary" on public.report_photos;
create policy "Read photos of public or own reports" on public.report_photos
  for select to anon, authenticated using (exists (
    select 1 from public.fishing_reports r where r.id = report_id and r.user_id = report_photos.user_id
      and (r.user_id = (select auth.uid()) or (r.is_public and sanitized_path is not null))
  ));
-- Restrictive boundary also covers any older permissive policies left in a target project.
create policy "Photo visibility boundary" on public.report_photos as restrictive
  for select to anon, authenticated using (exists (
    select 1 from public.fishing_reports r where r.id = report_id and r.user_id = report_photos.user_id
      and (r.user_id = (select auth.uid()) or (r.is_public and sanitized_path is not null))
  ));
create policy "Delete photos from own reports" on public.report_photos
  for delete to authenticated using (user_id = (select auth.uid()) and exists (
    select 1 from public.fishing_reports r where r.id = report_id and r.user_id = (select auth.uid())
  ));

create or replace function public.zapruda_guard_report_photo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if row(new.id, new.report_id, new.user_id) is distinct from row(old.id, old.report_id, old.user_id) then
      raise exception 'Photo identity is immutable' using errcode = '23514';
    end if;
  else
    -- Serialize the count against the report row, including concurrent uploads.
    perform 1 from public.fishing_reports where id = new.report_id and user_id = new.user_id for update;
    if not found then raise exception 'Photo owner mismatch' using errcode = '23514'; end if;
    if (select count(*) from public.report_photos where report_id = new.report_id) >= 6 then
      raise exception 'At most six photos per report' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.zapruda_guard_report_photo() from public, anon, authenticated;
drop trigger if exists zapruda_guard_report_photo on public.report_photos;
create trigger zapruda_guard_report_photo before insert or update on public.report_photos
  for each row execute function public.zapruda_guard_report_photo();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('report-photo-derivatives','report-photo-derivatives',false,5242880,array['image/jpeg'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg'];
-- Never expose legacy originals through a public bucket URL, either.
update storage.buckets set public=false where id='report-photos';

drop policy if exists "Read accessible fishing report photos" on storage.objects;
create policy "Read accessible fishing report photos" on storage.objects
  for select to authenticated using (bucket_id='report-photos'
    and (storage.foldername(name))[1]=(select auth.uid())::text and exists (
      select 1 from public.fishing_reports r
      where r.id::text=(storage.foldername(name))[2] and r.user_id=(select auth.uid())
    ));
drop policy if exists "Report original boundary" on storage.objects;
create policy "Report original boundary" on storage.objects as restrictive
  for select to anon, authenticated using (bucket_id<>'report-photos' or (
    (storage.foldername(name))[1]=(select auth.uid())::text and exists (
      select 1 from public.fishing_reports r
      where r.id::text=(storage.foldername(name))[2] and r.user_id=(select auth.uid())
    )
  ));

drop policy if exists "Read sanitized report photos" on storage.objects;
create policy "Read sanitized report photos" on storage.objects
  for select to anon, authenticated using (bucket_id='report-photo-derivatives' and exists (
    select 1 from public.report_photos p join public.fishing_reports r on r.id=p.report_id
    where p.sanitized_path=name and p.user_id=r.user_id
      and (r.is_public or r.user_id=(select auth.uid()))
  ));
drop policy if exists "Report derivative boundary" on storage.objects;
create policy "Report derivative boundary" on storage.objects as restrictive
  for select to anon, authenticated using (bucket_id<>'report-photo-derivatives' or exists (
    select 1 from public.report_photos p join public.fishing_reports r on r.id=p.report_id
    where p.sanitized_path=name and p.user_id=r.user_id
      and (r.is_public or r.user_id=(select auth.uid()))
  ));
-- Browser clients cannot upload a disguised original or overwrite a trusted derivative.
drop policy if exists "Report derivatives server insert" on storage.objects;
create policy "Report derivatives server insert" on storage.objects as restrictive
  for insert to anon, authenticated with check (bucket_id<>'report-photo-derivatives');
drop policy if exists "Report derivatives server update" on storage.objects;
create policy "Report derivatives server update" on storage.objects as restrictive
  for update to anon, authenticated using (bucket_id<>'report-photo-derivatives')
  with check (bucket_id<>'report-photo-derivatives');
