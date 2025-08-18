-- Corriger les données de l'offre spécifique avec les bonnes valeurs
UPDATE offers 
SET 
  financed_amount = 2915.03,
  margin = 1158.03,
  updated_at = now()
WHERE id = '0e4f5e8e-4125-488f-92f7-4ec9c8daadc6';