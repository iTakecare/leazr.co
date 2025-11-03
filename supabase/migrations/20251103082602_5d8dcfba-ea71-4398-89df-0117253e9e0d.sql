-- Migration 2: Sécuriser les Storage Buckets sensibles
-- Rendre privés les buckets contenant des données sensibles

-- 1. Rendre les buckets sensibles privés
UPDATE storage.buckets 
SET public = false 
WHERE id IN (
  'client-logos',
  'pdf-templates', 
  'pdf-templates-assets',
  'pdf-template-assets',
  'site-settings'
);

-- 2. Créer des policies RLS pour client-logos (accès admin uniquement)
CREATE POLICY "Admins can view client logos" 
ON storage.objects 
FOR SELECT
USING (
  bucket_id = 'client-logos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Admins can upload client logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-logos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Admins can update client logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-logos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Admins can delete client logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-logos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 3. Créer des policies pour pdf-templates (accès admin uniquement)
CREATE POLICY "Admins can view pdf templates"
ON storage.objects
FOR SELECT
USING (
  bucket_id IN ('pdf-templates', 'pdf-templates-assets', 'pdf-template-assets')
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Admins can manage pdf templates"
ON storage.objects
FOR ALL
USING (
  bucket_id IN ('pdf-templates', 'pdf-templates-assets', 'pdf-template-assets')
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id IN ('pdf-templates', 'pdf-templates-assets', 'pdf-template-assets')
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 4. Créer des policies pour site-settings (accès admin uniquement)
CREATE POLICY "Admins can manage site settings"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'site-settings'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'site-settings'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);