-- Migration pour corriger les catégories des champs PDF existants
-- Correction des catégories en français vers les IDs en anglais minuscules

UPDATE pdf_models 
SET fields = (
  SELECT jsonb_agg(
    CASE 
      WHEN field->>'category' = 'Client' THEN field || '{"category": "client"}'::jsonb
      WHEN field->>'category' = 'Offre' THEN field || '{"category": "offer"}'::jsonb
      WHEN field->>'category' = 'Équipement' THEN field || '{"category": "equipment"}'::jsonb
      WHEN field->>'category' = 'Vendeur' THEN field || '{"category": "user"}'::jsonb
      WHEN field->>'category' = 'Général' THEN field || '{"category": "general"}'::jsonb
      ELSE field
    END
  )
  FROM jsonb_array_elements(fields) AS field
)
WHERE fields IS NOT NULL AND jsonb_array_length(fields) > 0;