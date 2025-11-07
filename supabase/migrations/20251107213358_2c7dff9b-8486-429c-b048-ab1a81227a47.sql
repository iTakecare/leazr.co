-- Create storage bucket for company assets (values icons and partner logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company assets
CREATE POLICY "Company assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Users can upload their company assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their company assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their company assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);