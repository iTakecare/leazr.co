-- Créer une table séparée pour les images des modèles PDF
CREATE TABLE public.pdf_model_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL, -- Base64 data
  page INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_pdf_model_images_model_id ON public.pdf_model_images(model_id);
CREATE INDEX idx_pdf_model_images_page ON public.pdf_model_images(model_id, page);

-- RLS policies
ALTER TABLE public.pdf_model_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage pdf_model_images" 
ON public.pdf_model_images 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Public read pdf_model_images" 
ON public.pdf_model_images 
FOR SELECT 
USING (true);

-- Fonction pour mettre à jour updated_at
CREATE TRIGGER update_pdf_model_images_updated_at
BEFORE UPDATE ON public.pdf_model_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();