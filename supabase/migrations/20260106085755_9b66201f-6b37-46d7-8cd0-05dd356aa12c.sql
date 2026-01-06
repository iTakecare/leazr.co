-- Create pack-images storage bucket for pack images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pack-images', 
  'pack-images', 
  true, 
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for pack-images bucket

-- Policy: Public read access for pack images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Pack images are publicly accessible'
  ) THEN
    CREATE POLICY "Pack images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'pack-images');
  END IF;
END $$;

-- Policy: Authenticated users can upload pack images for their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload pack images for their company'
  ) THEN
    CREATE POLICY "Users can upload pack images for their company"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'pack-images' 
      AND (
        name LIKE 'company-' || public.get_current_user_company_id_secure() || '/%'
        OR public.is_admin_optimized()
      )
    );
  END IF;
END $$;

-- Policy: Authenticated users can update pack images for their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update pack images for their company'
  ) THEN
    CREATE POLICY "Users can update pack images for their company"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'pack-images' 
      AND (
        name LIKE 'company-' || public.get_current_user_company_id_secure() || '/%'
        OR public.is_admin_optimized()
      )
    );
  END IF;
END $$;

-- Policy: Authenticated users can delete pack images for their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete pack images for their company'
  ) THEN
    CREATE POLICY "Users can delete pack images for their company"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'pack-images' 
      AND (
        name LIKE 'company-' || public.get_current_user_company_id_secure() || '/%'
        OR public.is_admin_optimized()
      )
    );
  END IF;
END $$;