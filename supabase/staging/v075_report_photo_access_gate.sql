-- STAGING only. All new gallery access goes through report-photo-access, which
-- checks publication on every GET. Do not issue reusable public Storage tokens.
-- Restrictive policy also wins over broad pre-existing permissive policies.
drop policy if exists "Report derivatives require visibility gateway" on storage.objects;
create policy "Report derivatives require visibility gateway" on storage.objects
as restrictive for select to anon,authenticated
using (bucket_id <> 'report-photo-derivatives');
