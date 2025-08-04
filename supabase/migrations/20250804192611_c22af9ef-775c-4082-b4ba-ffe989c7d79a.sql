-- Créer la table custom_pdf_templates
CREATE TABLE IF NOT EXISTS public.custom_pdf_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  original_pdf_url TEXT NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contrainte : 1 seul template actif par client
  CONSTRAINT unique_active_template_per_client 
    EXCLUDE (client_id WITH =) WHERE (is_active = true)
);

-- Index pour performance
CREATE INDEX idx_custom_pdf_templates_client_id ON public.custom_pdf_templates(client_id);
CREATE INDEX idx_custom_pdf_templates_company_id ON public.custom_pdf_templates(company_id);

-- RLS pour isolation par entreprise
ALTER TABLE public.custom_pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates access by company" ON public.custom_pdf_templates
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_custom_pdf_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;