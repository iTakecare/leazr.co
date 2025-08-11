-- Créer les politiques RLS pour le bucket product-images

-- Politique pour permettre l'upload d'images produits par les utilisateurs authentifiés de la même compagnie
CREATE POLICY "Company users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL 
  AND (
    (storage.foldername(name))[1] LIKE 'products/%' 
    OR (storage.foldername(name))[1] = ('company-' || (
      SELECT (profiles.company_id)::text 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ))
  )
);

-- Politique pour permettre la lecture des images produits par les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view product images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Politique pour permettre la mise à jour des images produits par les utilisateurs de la même compagnie
CREATE POLICY "Company users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL 
  AND (
    (storage.foldername(name))[1] LIKE 'products/%' 
    OR (storage.foldername(name))[1] = ('company-' || (
      SELECT (profiles.company_id)::text 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ))
  )
);

-- Politique pour permettre la suppression des images produits par les utilisateurs de la même compagnie
CREATE POLICY "Company users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL 
  AND (
    (storage.foldername(name))[1] LIKE 'products/%' 
    OR (storage.foldername(name))[1] = ('company-' || (
      SELECT (profiles.company_id)::text 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ))
  )
);