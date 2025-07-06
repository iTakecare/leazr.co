-- Vérifier et créer le bucket product-images avec les bonnes politiques
SELECT create_storage_bucket('product-images');

-- Vérifier les politiques existantes pour product-images
SELECT name, definition, operations FROM storage.policies WHERE bucket_id = 'product-images';

-- Supprimer les anciennes politiques si elles existent
DELETE FROM storage.policies WHERE bucket_id = 'product-images';

-- Créer des politiques RLS appropriées pour product-images
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Company users can upload product images',
  '(auth.uid() IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN (''admin'', ''super_admin'')
    )
  )',
  'product-images',
  '{INSERT,UPDATE,DELETE}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Public can view product images',
  'TRUE',
  'product-images',
  '{SELECT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;