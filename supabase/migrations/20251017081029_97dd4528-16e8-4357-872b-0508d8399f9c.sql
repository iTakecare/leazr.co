-- Mettre à jour le workflow "Demande Web" pour avoir son propre type
UPDATE workflow_templates 
SET offer_type = 'web_request',
    updated_at = now()
WHERE name = 'Demande Web' 
  AND offer_type = 'client_request';