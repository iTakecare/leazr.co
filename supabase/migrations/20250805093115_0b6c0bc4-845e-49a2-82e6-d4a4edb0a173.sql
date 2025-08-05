-- Corriger les templates existants qui ont field_mappings vide
UPDATE custom_pdf_templates 
SET field_mappings = '[]'::jsonb,
    updated_at = now()
WHERE field_mappings = '{}'::jsonb;