-- Politique pour permettre aux admins d'uploader des logos de leasers
CREATE POLICY "Admins can upload leaser logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'leaser-logos' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Politique pour permettre aux admins de mettre à jour des logos de leasers
CREATE POLICY "Admins can update leaser logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'leaser-logos' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Politique pour permettre aux admins de supprimer des logos de leasers
CREATE POLICY "Admins can delete leaser logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'leaser-logos' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Politique pour permettre la lecture publique des logos de leasers
CREATE POLICY "Anyone can view leaser logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'leaser-logos');