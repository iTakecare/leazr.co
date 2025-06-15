
-- Créer le bucket site-settings s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-settings',
  'site-settings', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Supprimer toutes les politiques existantes sur le bucket site-settings
DROP POLICY IF EXISTS "Allow all access to site-settings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from their company" ON storage.objects;

-- Créer des politiques ultra-permissives pour site-settings
CREATE POLICY "Allow public read access to site-settings" ON storage.objects
FOR SELECT USING (bucket_id = 'site-settings');

CREATE POLICY "Allow public insert to site-settings" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'site-settings');

CREATE POLICY "Allow public update to site-settings" ON storage.objects
FOR UPDATE USING (bucket_id = 'site-settings');

CREATE POLICY "Allow public delete from site-settings" ON storage.objects
FOR DELETE USING (bucket_id = 'site-settings');
