-- Ensure bucket exists and accepts PDFs (idempotent)
insert into storage.buckets (id, name, public)
values ('platform-assets', 'platform-assets', true)
on conflict (id) do nothing;

update storage.buckets
set allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf', 'application/octet-stream', 'application/*'],
    file_size_limit = 52428800
where id = 'platform-assets';

-- Create RLS policies on storage.objects without altering the table
-- SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'platform_assets_company_select'
  ) THEN
    CREATE POLICY "platform_assets_company_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'platform-assets'
      AND (
        name LIKE ('company-' || public.get_current_user_company_id_secure() || '/%')
        OR public.is_admin_optimized()
      )
    );
  END IF;
END$$;

-- INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'platform_assets_company_insert'
  ) THEN
    CREATE POLICY "platform_assets_company_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'platform-assets'
      AND (
        name LIKE ('company-' || public.get_current_user_company_id_secure() || '/%')
        OR public.is_admin_optimized()
      )
    );
  END IF;
END$$;

-- UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'platform_assets_company_update'
  ) THEN
    CREATE POLICY "platform_assets_company_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'platform-assets'
      AND (
        name LIKE ('company-' || public.get_current_user_company_id_secure() || '/%')
        OR public.is_admin_optimized()
      )
    )
    WITH CHECK (
      bucket_id = 'platform-assets'
      AND (
        name LIKE ('company-' || public.get_current_user_company_id_secure() || '/%')
        OR public.is_admin_optimized()
      )
    );
  END IF;
END$$;

-- DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'platform_assets_company_delete'
  ) THEN
    CREATE POLICY "platform_assets_company_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'platform-assets'
      AND (
        name LIKE ('company-' || public.get_current_user_company_id_secure() || '/%')
        OR public.is_admin_optimized()
      )
    );
  END IF;
END$$;
