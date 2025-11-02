-- Créer les politiques RLS pour le bucket product-images
-- Permettre la lecture publique de toutes les images

CREATE POLICY "Public read access for product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Permettre l'upload pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Permettre la mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Permettre la suppression pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Corriger les URLs avec double slash dans la table products
UPDATE products
SET image_url = REPLACE(image_url, '/products//', '/products/')
WHERE image_url LIKE '%/products//%';