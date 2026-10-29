-- The owner's photo uploads (spec 0017). Run once in the Supabase dashboard SQL editor, after
-- publish.sql. Public reads stay as they are (schema.sql): the bucket is public, so a photo's
-- public URL needs no policy.
--
-- Check first that the bucket has these columns (spec 0017, T1); if not, stop:
--   select id, file_size_limit, allowed_mime_types from storage.buckets;

-- The bucket refuses what the admin never sends: anything but JPEG, or over 2 MB.
update storage.buckets
  set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg']
  where id = 'product-photos';

-- Names follow the upload rule <id>-<8 hex>.jpg (seed photos, <id>.jpg, match it too). Nothing
-- is ever overwritten, so there is no update policy.
create policy "owner uploads photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_owner()
              and name ~ '^[a-z0-9]+(-[a-z0-9]+)*\.jpg$');
-- Storage reads the object row before deleting it.
create policy "owner reads photo rows" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
create policy "owner deletes photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
