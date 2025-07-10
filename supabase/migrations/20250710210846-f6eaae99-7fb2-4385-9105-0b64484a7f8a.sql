-- Créer un template PDF par défaut pour chaque entreprise qui n'en a pas
INSERT INTO pdf_templates (
  id,
  name,
  "companyName",
  "companyAddress", 
  "companyContact",
  "companySiret",
  "logoURL",
  "primaryColor",
  "secondaryColor",
  "headerText",
  "footerText",
  fields,
  "templateImages",
  company_id,
  template_type,
  is_active,
  is_default,
  field_mappings,
  created_at,
  updated_at
)
SELECT 
  'default-' || c.id as id,
  'Modèle par défaut' as name,
  COALESCE(cc.company_name, c.name, 'Votre Entreprise') as "companyName",
  COALESCE(cc.company_address, 'Adresse à renseigner') as "companyAddress",
  COALESCE(cc.company_email, cc.company_phone, 'contact@votre-entreprise.com') as "companyContact",
  'SIRET à renseigner' as "companySiret",
  COALESCE(cc.logo_url, '') as "logoURL",
  COALESCE(cc.primary_color, c.primary_color, '#3b82f6') as "primaryColor",
  COALESCE(cc.secondary_color, c.secondary_color, '#64748b') as "secondaryColor",
  'Offre de Leasing' as "headerText",
  'Merci de votre confiance' as "footerText",
  '[]'::jsonb as fields,
  '[]'::jsonb as "templateImages",
  c.id as company_id,
  'standard' as template_type,
  true as is_active,
  true as is_default,
  '{}'::jsonb as field_mappings,
  NOW() as created_at,
  NOW() as updated_at
FROM companies c
LEFT JOIN company_customizations cc ON c.id = cc.company_id
WHERE c.id NOT IN (
  SELECT DISTINCT company_id 
  FROM pdf_templates 
  WHERE company_id IS NOT NULL
)
AND c.is_active = true;