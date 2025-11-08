-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for offer-images bucket
CREATE POLICY "Allow public read access to offer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-images');

CREATE POLICY "Allow authenticated users to upload offer images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'offer-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update offer images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'offer-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete offer images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'offer-images' 
  AND auth.role() = 'authenticated'
);