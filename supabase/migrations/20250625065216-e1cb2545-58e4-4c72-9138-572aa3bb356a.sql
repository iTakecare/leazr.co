
-- Table pour stocker les documents uploadés
CREATE TABLE public.offer_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'balance_sheet', 'tax_notice', 'id_card', etc.
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by TEXT, -- Email du client ou ID utilisateur
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les liens d'upload sécurisés
CREATE TABLE public.offer_upload_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  requested_documents TEXT[] NOT NULL,
  custom_message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer le bucket de stockage pour les documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-documents', 'Offer Documents', false);

-- Politique pour permettre l'upload des documents avec un token valide
CREATE POLICY "Allow document uploads with valid token" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'offer-documents' AND
  EXISTS (
    SELECT 1 FROM public.offer_upload_links 
    WHERE token = (storage.foldername(name))[1] 
    AND expires_at > now() 
    AND used_at IS NULL
  )
);

-- Politique pour permettre la lecture des documents aux utilisateurs autorisés
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
    -- Client access with valid token
    EXISTS (
      SELECT 1 FROM public.offer_upload_links 
      WHERE token = (storage.foldername(name))[1] 
      AND expires_at > now()
    )
  )
);

-- RLS pour offer_documents
ALTER TABLE public.offer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documents" 
ON public.offer_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS pour offer_upload_links
ALTER TABLE public.offer_upload_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upload links" 
ON public.offer_upload_links 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Index pour améliorer les performances
CREATE INDEX idx_offer_documents_offer_id ON public.offer_documents(offer_id);
CREATE INDEX idx_offer_documents_status ON public.offer_documents(status);
CREATE INDEX idx_offer_upload_links_token ON public.offer_upload_links(token);
CREATE INDEX idx_offer_upload_links_expires_at ON public.offer_upload_links(expires_at);
