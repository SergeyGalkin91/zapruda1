-- v0.7.5 SPOT: private evidence bucket, STAGING ONLY.
-- No anonymous/authenticated storage.objects policies for this bucket.
-- Uploads and reviews must be performed later by a trusted server endpoint.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'zc-spot-evidence-staging',
  'zc-spot-evidence-staging',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict(id) do nothing;
