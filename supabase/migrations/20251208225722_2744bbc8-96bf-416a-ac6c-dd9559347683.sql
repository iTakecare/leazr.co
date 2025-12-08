-- Corriger les données NULL existantes
UPDATE offers 
SET converted_to_contract = false 
WHERE converted_to_contract IS NULL;

-- Ajouter la contrainte NOT NULL avec DEFAULT false
ALTER TABLE offers 
  ALTER COLUMN converted_to_contract SET DEFAULT false,
  ALTER COLUMN converted_to_contract SET NOT NULL;