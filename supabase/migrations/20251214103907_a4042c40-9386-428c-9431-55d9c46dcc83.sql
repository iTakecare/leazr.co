-- Corriger le signature_status du contrat qui a été signé mais avec mauvais statut
UPDATE contracts 
SET signature_status = 'signed' 
WHERE id = '5ecc2524-760a-4e16-9151-b5f80593dc0b' 
  AND status = 'signed';

-- S'assurer que tous les contrats signés ont le bon signature_status
UPDATE contracts 
SET signature_status = 'signed' 
WHERE status = 'signed' 
  AND signature_status != 'signed';