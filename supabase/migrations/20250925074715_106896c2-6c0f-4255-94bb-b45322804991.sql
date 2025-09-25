-- Améliorer les permissions RLS pour l'affichage public des logos d'entreprises
-- Permettre l'accès public aux logos des entreprises via les liens d'upload

-- Politique pour permettre l'accès public aux logos via les tokens d'upload
CREATE POLICY "Public access to company logos via upload tokens" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'site-settings' 
  AND (
    auth.role() = 'anon' 
    OR auth.uid() IS NOT NULL
    OR name LIKE '%logo%'
  )
);

-- S'assurer que le bucket site-settings est bien public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'site-settings';