-- ===========================================================================
-- Bet It — 0003: proof storage (images + videos)
-- ===========================================================================
-- Run in the Supabase SQL editor after 0002. Creates the public `proofs`
-- bucket for check-in proof uploads, whitelists image/video types, caps file
-- size, and scopes writes to each user's own folder (proofs/<uid>/...), which
-- matches how the app names uploads in src/api/db.js.
-- Note: 50MB is the Supabase free-tier per-file hard cap — good for short
-- clips, not long recordings.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs', 'proofs', true,
  52428800,  -- 50 MB per file
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Re-runnable: drop then recreate the policies
drop policy if exists "proofs read"   on storage.objects;
drop policy if exists "proofs upload" on storage.objects;
drop policy if exists "proofs delete" on storage.objects;

-- Anyone can view (bucket is public)
create policy "proofs read" on storage.objects
  for select to public
  using (bucket_id = 'proofs');

-- Signed-in users upload only into their own folder: proofs/<their-uid>/...
create policy "proofs upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploads
create policy "proofs delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
