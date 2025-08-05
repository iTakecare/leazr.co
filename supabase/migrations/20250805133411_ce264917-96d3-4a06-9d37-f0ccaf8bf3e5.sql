-- Fix storage policies for template-images bucket

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Template images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete template images" ON storage.objects;

-- Create comprehensive policies for template images
CREATE POLICY "Template images public read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'template-images');

CREATE POLICY "Authenticated users can upload template images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'template-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update template images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'template-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete template images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'template-images' 
  AND auth.uid() IS NOT NULL
);