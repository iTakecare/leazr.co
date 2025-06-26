
-- Supprimer les anciennes politiques RLS restrictives pour offer_documents
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.offer_documents;

-- Créer une politique pour permettre l'insertion de documents avec un token valide
CREATE POLICY "Allow document insertion with valid token" 
ON public.offer_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.offer_upload_links 
    WHERE token = (
      SELECT token FROM public.offer_upload_links 
      WHERE offer_id = offer_documents.offer_id 
      AND expires_at > now() 
      AND used_at IS NULL
      LIMIT 1
    )
    AND offer_id = offer_documents.offer_id
    AND expires_at > now()
    AND used_at IS NULL
  )
);

-- Créer une politique pour permettre aux admins de voir tous les documents
CREATE POLICY "Admins can view all documents" 
ON public.offer_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Créer une politique pour permettre aux clients de voir leurs documents uploadés via token
CREATE POLICY "Clients can view documents uploaded via valid token" 
ON public.offer_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.offer_upload_links 
    WHERE token = (
      SELECT token FROM public.offer_upload_links 
      WHERE offer_id = offer_documents.offer_id 
      AND expires_at > now()
      LIMIT 1
    )
    AND offer_id = offer_documents.offer_id
  )
);

-- Créer une politique pour permettre aux admins de mettre à jour le statut des documents
CREATE POLICY "Admins can update document status" 
ON public.offer_documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
