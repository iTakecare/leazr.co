-- Corriger les offres converties en contrats pour qu'elles aient le statut "accepted"
-- au lieu de "financed" afin qu'elles restent visibles dans la liste

UPDATE public.offers 
SET 
  status = 'accepted',
  workflow_status = 'accepted'
WHERE converted_to_contract = true 
  AND (workflow_status = 'financed' OR status = 'financed');

-- Mise à jour des offres qui pourraient avoir d'autres statuts problématiques
UPDATE public.offers 
SET status = 'accepted'
WHERE converted_to_contract = true 
  AND status != 'accepted';