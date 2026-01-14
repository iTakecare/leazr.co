-- Mettre à jour la durée de l'offre
UPDATE offers 
SET contract_duration = 30, updated_at = NOW()
WHERE id = '8ea5c5d1-35f5-4e72-8323-8370579564aa';

-- Mettre à jour la durée du contrat
UPDATE contracts 
SET contract_duration = 30, updated_at = NOW()
WHERE id = 'acb7aa7f-63ed-4d4c-a81e-621fc48128fd';