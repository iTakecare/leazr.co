-- Corriger le contrat existant avec le bon leaser_id et leaser_name
UPDATE contracts 
SET 
  leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949',
  leaser_name = '1. Grenke Lease'
WHERE id = '7dce478f-6538-47bb-92a6-74f193972e49'
  AND leaser_id IS NULL;