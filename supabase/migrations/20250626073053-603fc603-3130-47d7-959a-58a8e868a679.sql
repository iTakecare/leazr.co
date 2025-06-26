
-- Créer une politique RLS pour permettre l'accès public aux liens d'upload valides
CREATE POLICY "Allow public access to valid upload links" 
ON public.offer_upload_links
FOR SELECT 
USING (
  expires_at > now() 
  AND used_at IS NULL
);

-- Mettre à jour la politique de storage pour permettre l'accès aux documents avec un token valide
DROP POLICY IF EXISTS "Allow document access to authorized users" ON storage.objects;

CREATE POLICY "Allow document access to authorized users" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'offer-documents' AND
  (
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    -- Public access with valid token
    EXISTS (
      SELECT 1 FROM public.offer_upload_links 
      WHERE token = (storage.foldername(name))[1] 
      AND expires_at > now()
      AND used_at IS NULL
    )
  )
);
