-- Supprimer les anciennes policies restrictives pour company-assets
DROP POLICY IF EXISTS "Users can upload their company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company assets" ON storage.objects;

-- Créer des policies plus permissives pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets')
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');