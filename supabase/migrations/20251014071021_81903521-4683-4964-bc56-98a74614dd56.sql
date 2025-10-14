-- Créer le bucket Storage pour les PDFs d'offres
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offer-pdfs',
  'offer-pdfs',
  false,
  10485760, -- 10MB max
  ARRAY['application/pdf']
);

-- Politique RLS : Les utilisateurs peuvent lire les PDFs de leur entreprise
CREATE POLICY "Users can view PDFs from their company"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'offer-pdfs' AND
  (storage.foldername(name))[1] = CONCAT('company-', (SELECT company_id::text FROM profiles WHERE id = auth.uid()))
);

-- Politique RLS : Les utilisateurs peuvent créer des PDFs pour leur entreprise
CREATE POLICY "Users can create PDFs for their company"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-pdfs' AND
  (storage.foldername(name))[1] = CONCAT('company-', (SELECT company_id::text FROM profiles WHERE id = auth.uid()))
);

-- Politique RLS : Les utilisateurs peuvent mettre à jour les PDFs de leur entreprise
CREATE POLICY "Users can update PDFs from their company"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-pdfs' AND
  (storage.foldername(name))[1] = CONCAT('company-', (SELECT company_id::text FROM profiles WHERE id = auth.uid()))
);

-- Politique RLS : Seuls les admins peuvent supprimer des PDFs
CREATE POLICY "Only admins can delete PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-pdfs' AND
  is_admin_optimized()
);