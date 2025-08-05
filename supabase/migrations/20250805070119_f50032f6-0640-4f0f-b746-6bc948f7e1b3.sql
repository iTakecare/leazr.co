-- Fix PDF templates bucket access with correct RLS policies on storage.objects

-- Create pdf-templates bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-templates', 
  'PDF Templates', 
  false, 
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['application/pdf'],
  file_size_limit = 10485760,
  public = false;

-- Create RLS policies on storage.objects for pdf-templates bucket
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

-- Add policy to allow authenticated users to list buckets
CREATE POLICY "Allow authenticated users to list buckets"
ON storage.buckets
FOR SELECT
USING (auth.uid() IS NOT NULL);