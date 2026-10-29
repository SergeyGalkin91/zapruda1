-- ZAPRUDA fishing-report galleries
-- Review against the connected Supabase project before applying.
-- The bucket is PRIVATE. Public reports can be shared using time-limited
-- signed image URLs; private-report photos remain visible only to their author.
create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fishing_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0 check (sort_order between 0 and 20),
  created_at timestamptz not null default now(),
  constraint report_photos_path_format check (storage_path = user_id::text || '/' || report_id::text || '/' || split_part(storage_path, '/', 3)),
  constraint report_photos_no_extra_folders check (array_length(string_to_array(storage_path, '/'), 1) = 3)
);

create index if not exists report_photos_report_order_idx
  on public.report_photos(report_id, sort_order, created_at);

alter table public.report_photos enable row level security;

drop policy if exists "Read photos of public or own reports" on public.report_photos;
create policy "Read photos of public or own reports"
  on public.report_photos for select to anon, authenticated
  using (exists (
    select 1 from public.fishing_reports r
    where r.id = report_id and (r.is_public or r.user_id = auth.uid())
  ));

drop policy if exists "Add photos to own reports" on public.report_photos;
create policy "Add photos to own reports"
  on public.report_photos for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.fishing_reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Delete photos from own reports" on public.report_photos;
create policy "Delete photos from own reports"
  on public.report_photos for delete to authenticated
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos', 'report-photos', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Read accessible fishing report photos" on storage.objects;
create policy "Read accessible fishing report photos"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'report-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.report_photos p
        join public.fishing_reports r on r.id = p.report_id
        where p.storage_path = name and r.is_public
      )
    )
  );

drop policy if exists "Upload own fishing report photos" on storage.objects;
create policy "Upload own fishing report photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.fishing_reports r
      where r.id::text = (storage.foldername(name))[2]
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "Delete own fishing report photos" on storage.objects;
create policy "Delete own fishing report photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
