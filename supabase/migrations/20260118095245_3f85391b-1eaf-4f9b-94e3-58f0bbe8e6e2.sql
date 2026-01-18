-- Supprimer les anciennes policies pour les recréer avec le rôle broker
DROP POLICY IF EXISTS "Admins can upload leaser logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update leaser logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete leaser logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view leaser logos" ON storage.objects;

-- Politique pour permettre aux admins et brokers d'uploader des logos de leasers
CREATE POLICY "Admins and brokers can upload leaser logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leaser-logos' 
  AND (
    public.has_role(auth.uid(), 'broker'::public.app_role) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Politique pour permettre aux admins et brokers de mettre à jour des logos de leasers
CREATE POLICY "Admins and brokers can update leaser logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leaser-logos' 
  AND (
    public.has_role(auth.uid(), 'broker'::public.app_role) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Politique pour permettre aux admins et brokers de supprimer des logos de leasers
CREATE POLICY "Admins and brokers can delete leaser logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leaser-logos' 
  AND (
    public.has_role(auth.uid(), 'broker'::public.app_role) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- Politique pour permettre la lecture publique des logos de leasers
CREATE POLICY "Anyone can view leaser logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'leaser-logos');