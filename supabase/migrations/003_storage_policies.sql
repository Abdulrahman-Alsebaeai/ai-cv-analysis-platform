-- Allow users to manage only their own files in the 'resumes' bucket
-- Path format inside bucket: <auth.uid()>/<job_id>/<application_id>/<filename>

-- INSERT (upload)
drop policy if exists "resumes_upload_own" on storage.objects;
create policy "resumes_upload_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and (name like (auth.uid()::text || '/%'))
);

-- SELECT (download/list)
drop policy if exists "resumes_read_own" on storage.objects;
create policy "resumes_read_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'resumes'
  and (name like (auth.uid()::text || '/%'))
);

-- UPDATE (overwrite via upsert)
drop policy if exists "resumes_update_own" on storage.objects;
create policy "resumes_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'resumes'
  and (name like (auth.uid()::text || '/%'))
)
with check (
  bucket_id = 'resumes'
  and (name like (auth.uid()::text || '/%'))
);

-- DELETE (optional)
drop policy if exists "resumes_delete_own" on storage.objects;
create policy "resumes_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'resumes'
  and (name like (auth.uid()::text || '/%'))
);
