-- Create RLS policies for pdf-templates-assets bucket

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload to pdf-templates-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdf-templates-assets' 
  AND auth.uid() IS NOT NULL
);

-- Policy to allow public read access to images
CREATE POLICY "Allow public read access to pdf-templates-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pdf-templates-assets');

-- Policy to allow authenticated users to update their images
CREATE POLICY "Allow authenticated users to update pdf-templates-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pdf-templates-assets' 
  AND auth.uid() IS NOT NULL
);

-- Policy to allow authenticated users to delete their images
CREATE POLICY "Allow authenticated users to delete pdf-templates-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdf-templates-assets' 
  AND auth.uid() IS NOT NULL
);