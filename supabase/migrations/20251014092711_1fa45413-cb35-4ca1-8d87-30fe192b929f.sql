-- Créer la table pour les templates PDF professionnels (7 pages Canva)
CREATE TABLE IF NOT EXISTS public.professional_pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page_number INTEGER NOT NULL CHECK (page_number >= 1 AND page_number <= 7),
  page_name TEXT NOT NULL,
  html_content TEXT NOT NULL DEFAULT '',
  css_styles TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  variables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, page_number)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_professional_pdf_templates_company 
ON public.professional_pdf_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_professional_pdf_templates_page_order 
ON public.professional_pdf_templates(company_id, page_number);

-- RLS Policy
ALTER TABLE public.professional_pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professional_pdf_templates_company_access" 
ON public.professional_pdf_templates
FOR ALL
USING (company_id = get_user_company_id() OR is_admin_optimized())
WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_professional_pdf_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_professional_pdf_templates_updated_at
  BEFORE UPDATE ON public.professional_pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_professional_pdf_templates_updated_at();

-- Commentaire
COMMENT ON TABLE public.professional_pdf_templates IS 'Templates pour les PDF professionnels à 7 pages (inspirés de Canva)';