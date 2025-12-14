-- Corriger le contrat existant : status doit être 'signed' et non 'active'
UPDATE contracts 
SET status = 'signed' 
WHERE signature_status = 'signed' 
AND status = 'active';

-- Mettre à jour le leaser_name pour les contrats self-leasing : utiliser company_name du leaser
UPDATE contracts c
SET leaser_name = l.company_name
FROM leasers l
WHERE c.leaser_id = l.id
AND l.is_own_company = true
AND l.company_name IS NOT NULL
AND l.company_name != ''
AND (c.leaser_name IS NULL OR c.leaser_name != l.company_name);