-- Clean up conflicting storage policies and ensure proper RLS setup

-- Remove any overly permissive policies that might conflict
DROP POLICY IF EXISTS "Allow all storage operations" ON storage.objects;

-- Ensure our specific pdf-templates policies are correctly applied
-- (These should already exist from the previous migration, but we're being explicit)

-- Remove existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete pdf-templates" ON storage.objects;

-- Recreate with proper authentication checks
CREATE POLICY "Allow authenticated users to view pdf-templates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pdf-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to upload pdf-templates"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pdf-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update pdf-templates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'pdf-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete pdf-templates"
ON storage.objects
FOR DELETE
USING (bucket_id = 'pdf-templates' AND auth.uid() IS NOT NULL);