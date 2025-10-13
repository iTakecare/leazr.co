-- Create platform-assets bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'platform-assets', 'platform-assets', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'platform-assets'
);

-- Public read for platform-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read platform-assets'
  ) THEN
    CREATE POLICY "Public read platform-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'platform-assets');
  END IF;
END $$;

-- Admins can insert into platform-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert platform-assets'
  ) THEN
    CREATE POLICY "Admin insert platform-assets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'platform-assets' AND public.is_admin_optimized()
    );
  END IF;
END $$;

-- Admins can update platform-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin update platform-assets'
  ) THEN
    CREATE POLICY "Admin update platform-assets"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'platform-assets' AND public.is_admin_optimized()
    )
    WITH CHECK (
      bucket_id = 'platform-assets' AND public.is_admin_optimized()
    );
  END IF;
END $$;

-- Admins can delete from platform-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete platform-assets'
  ) THEN
    CREATE POLICY "Admin delete platform-assets"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'platform-assets' AND public.is_admin_optimized()
    );
  END IF;
END $$;