-- Complete cleanup and recreation of pdf-templates bucket
-- Step 1: Remove the bucket entirely (this will also remove all associated policies)
DELETE FROM storage.objects WHERE bucket_id = 'pdf-templates';
DELETE FROM storage.buckets WHERE id = 'pdf-templates';

-- Step 2: Recreate the bucket as fully public for testing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-templates',
  'pdf-templates', 
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- Step 3: Create simple public access policies
CREATE POLICY "Public read access for pdf-templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-templates');

CREATE POLICY "Public insert access for pdf-templates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdf-templates');

CREATE POLICY "Public update access for pdf-templates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pdf-templates');

CREATE POLICY "Public delete access for pdf-templates"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdf-templates');