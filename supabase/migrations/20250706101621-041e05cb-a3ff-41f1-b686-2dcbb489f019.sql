-- Extension de la table pdf_templates pour le nouveau système
-- Ajout des colonnes pour la gestion multi-templates et multi-company

ALTER TABLE pdf_templates 
ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS template_file_url TEXT,
ADD COLUMN IF NOT EXISTS field_mappings JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category TEXT DEFAULT 'offer',
ADD COLUMN IF NOT EXISTS supported_offer_types TEXT[] DEFAULT ARRAY['standard'];

-- Contrainte pour s'assurer qu'il n'y a qu'un seul template par défaut par company et type
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_templates_default_unique 
ON pdf_templates (company_id, template_type, template_category) 
WHERE is_default = true;

-- Mise à jour des templates existants pour ajouter un company_id par défaut (iTakecare)
UPDATE pdf_templates 
SET company_id = (SELECT id FROM companies WHERE name = 'iTakecare' LIMIT 1)
WHERE company_id IS NULL;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_pdf_templates_company_type ON pdf_templates (company_id, template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_active ON pdf_templates (is_active, is_default);

-- Fonction pour récupérer le template approprié selon le type d'offre
CREATE OR REPLACE FUNCTION get_template_for_offer(
  p_company_id UUID,
  p_offer_type TEXT DEFAULT 'standard',
  p_template_category TEXT DEFAULT 'offer'
)
RETURNS TABLE(
  template_id TEXT,
  template_name TEXT,
  template_file_url TEXT,
  field_mappings JSONB,
  company_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.name,
    pt.template_file_url,
    pt.field_mappings,
    jsonb_build_object(
      'companyName', pt.companyName,
      'companyAddress', pt.companyAddress,
      'companyContact', pt.companyContact,
      'companySiret', pt.companySiret,
      'logoURL', pt.logoURL,
      'primaryColor', pt.primaryColor,
      'secondaryColor', pt.secondaryColor,
      'headerText', pt.headerText,
      'footerText', pt.footerText
    ) as company_data
  FROM pdf_templates pt
  WHERE pt.company_id = p_company_id
    AND pt.template_category = p_template_category
    AND pt.is_active = true
    AND (
      pt.template_type = p_offer_type 
      OR (pt.is_default = true AND NOT EXISTS(
        SELECT 1 FROM pdf_templates pt2 
        WHERE pt2.company_id = p_company_id 
          AND pt2.template_type = p_offer_type
          AND pt2.is_active = true
      ))
    )
  ORDER BY 
    CASE WHEN pt.template_type = p_offer_type THEN 1 ELSE 2 END,
    pt.is_default DESC,
    pt.created_at DESC
  LIMIT 1;
END;
$$;