
-- Créer les buckets manquants s'ils n'existent pas déjà
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 52428800, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('company-assets', 'company-assets', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('pdf-templates', 'pdf-templates', true, 10485760, ARRAY['application/pdf', 'text/html']),
  ('leaser-logos', 'leaser-logos', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('blog-images', 'blog-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Supprimer toutes les anciennes politiques conflictuelles
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Supprimer toutes les politiques existantes sur storage.objects pour éviter les conflits
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- S'assurer que RLS est activé
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Créer une seule politique ultra-permissive pour tous les buckets
CREATE POLICY "Allow all storage operations" ON storage.objects
FOR ALL USING (true);
