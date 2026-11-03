-- Complete the boundary even when another legacy policy grants broad DML.
drop policy if exists "Photo owner delete boundary" on public.report_photos;
create policy "Photo owner delete boundary" on public.report_photos as restrictive
for delete to authenticated using (user_id=(select auth.uid()) and exists (
  select 1 from public.fishing_reports r where r.id=report_id and r.user_id=(select auth.uid())
));
drop policy if exists "Report derivatives server delete" on storage.objects;
create policy "Report derivatives server delete" on storage.objects as restrictive
for delete to anon,authenticated using (bucket_id<>'report-photo-derivatives');
drop policy if exists "Report originals owner insert" on storage.objects;
create policy "Report originals owner insert" on storage.objects as restrictive
for insert to anon,authenticated with check (bucket_id<>'report-photos' or (
  (storage.foldername(name))[1]=(select auth.uid())::text and exists (
    select 1 from public.fishing_reports r where r.id::text=(storage.foldername(name))[2]
      and r.user_id=(select auth.uid())
  )
));
drop policy if exists "Report originals owner update" on storage.objects;
create policy "Report originals owner update" on storage.objects as restrictive
for update to anon,authenticated using (bucket_id<>'report-photos' or (
  (storage.foldername(name))[1]=(select auth.uid())::text and exists (
    select 1 from public.fishing_reports r where r.id::text=(storage.foldername(name))[2]
      and r.user_id=(select auth.uid())
  )
)) with check (bucket_id<>'report-photos' or (
  (storage.foldername(name))[1]=(select auth.uid())::text and exists (
    select 1 from public.fishing_reports r where r.id::text=(storage.foldername(name))[2]
      and r.user_id=(select auth.uid())
  )
));
drop policy if exists "Report originals owner delete" on storage.objects;
create policy "Report originals owner delete" on storage.objects as restrictive
for delete to anon,authenticated using (bucket_id<>'report-photos'
  or (storage.foldername(name))[1]=(select auth.uid())::text);
