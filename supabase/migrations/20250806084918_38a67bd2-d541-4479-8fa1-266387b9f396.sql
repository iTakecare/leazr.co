-- Créer le bucket client-logos avec les bonnes permissions multi-tenant
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos', 
  'Client Logos', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Créer les politiques RLS pour le bucket client-logos avec isolement multi-tenant
-- Politique pour lire les logos (public avec structure multi-tenant)
CREATE POLICY "Client logos public read access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'client-logos' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- Politique pour upload des logos (utilisateurs de l'entreprise seulement)
CREATE POLICY "Company users can upload client logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'client-logos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = 'company-' || (
    SELECT company_id::text 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Politique pour mise à jour des logos (utilisateurs de l'entreprise seulement)
CREATE POLICY "Company users can update client logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'client-logos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = 'company-' || (
    SELECT company_id::text 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Politique pour suppression des logos (utilisateurs de l'entreprise seulement)
CREATE POLICY "Company users can delete client logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'client-logos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = 'company-' || (
    SELECT company_id::text 
    FROM profiles 
    WHERE id = auth.uid()
  )
);