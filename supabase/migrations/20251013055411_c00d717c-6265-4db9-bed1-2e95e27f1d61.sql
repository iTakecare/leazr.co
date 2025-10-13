-- Add RLS policies for multi-tenant storage access on platform-assets
-- Allow authenticated users to insert/update/delete in their own company folder

-- Company users can insert into their own company folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company insert own folder platform-assets'
  ) THEN
    CREATE POLICY "Company insert own folder platform-assets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'platform-assets' AND 
      name LIKE 'company-' || public.get_user_company_id()::text || '/%'
    );
  END IF;
END $$;

-- Company users can update their own company folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company update own folder platform-assets'
  ) THEN
    CREATE POLICY "Company update own folder platform-assets"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'platform-assets' AND 
      name LIKE 'company-' || public.get_user_company_id()::text || '/%'
    )
    WITH CHECK (
      bucket_id = 'platform-assets' AND 
      name LIKE 'company-' || public.get_user_company_id()::text || '/%'
    );
  END IF;
END $$;

-- Company users can delete from their own company folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company delete own folder platform-assets'
  ) THEN
    CREATE POLICY "Company delete own folder platform-assets"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'platform-assets' AND 
      name LIKE 'company-' || public.get_user_company_id()::text || '/%'
    );
  END IF;
END $$;