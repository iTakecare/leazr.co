-- Créer des politiques RLS pour les buckets de stockage multi-tenant
-- Ces politiques s'appliquent à la table storage.objects

-- Politique pour permettre la lecture des fichiers de l'entreprise de l'utilisateur
CREATE POLICY "Users can view files from their company" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('avatars', 'product-images', 'company-assets', 'pdf-templates', 'leaser-logos', 'blog-images', 'site-settings')
  AND (
    -- Fichiers dans le dossier de l'entreprise de l'utilisateur
    name LIKE 'company-' || (SELECT company_id FROM public.profiles WHERE id = auth.uid())::text || '/%'
    OR
    -- Fichiers publics (sans préfixe company-)
    NOT name LIKE 'company-%'
  )
);

-- Politique pour permettre l'upload de fichiers dans le dossier de l'entreprise
CREATE POLICY "Users can upload files to their company folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('avatars', 'product-images', 'company-assets', 'pdf-templates', 'leaser-logos', 'blog-images', 'site-settings')
  AND (
    -- Fichiers dans le dossier de l'entreprise de l'utilisateur
    name LIKE 'company-' || (SELECT company_id FROM public.profiles WHERE id = auth.uid())::text || '/%'
  )
);

-- Politique pour permettre la mise à jour des fichiers de l'entreprise
CREATE POLICY "Users can update files from their company" ON storage.objects
FOR UPDATE USING (
  bucket_id IN ('avatars', 'product-images', 'company-assets', 'pdf-templates', 'leaser-logos', 'blog-images', 'site-settings')
  AND name LIKE 'company-' || (SELECT company_id FROM public.profiles WHERE id = auth.uid())::text || '/%'
);

-- Politique pour permettre la suppression des fichiers de l'entreprise
CREATE POLICY "Users can delete files from their company" ON storage.objects
FOR DELETE USING (
  bucket_id IN ('avatars', 'product-images', 'company-assets', 'pdf-templates', 'leaser-logos', 'blog-images', 'site-settings')
  AND name LIKE 'company-' || (SELECT company_id FROM public.profiles WHERE id = auth.uid())::text || '/%'
);

-- S'assurer que RLS est activé sur storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;