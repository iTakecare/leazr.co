-- Add SELECT policy for company-assets bucket
CREATE POLICY "Authenticated users can view company assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-assets');

-- Add INSERT policy for company-assets bucket (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload company assets'
  ) THEN
    CREATE POLICY "Authenticated users can upload company assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'company-assets');
  END IF;
END $$;

-- Add UPDATE policy for company-assets bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update company assets'
  ) THEN
    CREATE POLICY "Authenticated users can update company assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'company-assets');
  END IF;
END $$;