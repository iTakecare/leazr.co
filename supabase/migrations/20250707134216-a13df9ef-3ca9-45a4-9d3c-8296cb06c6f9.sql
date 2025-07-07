-- Mettre à jour l'offre de Jean Jean pour déclencher la conversion en contrat
UPDATE offers 
SET workflow_status = 'financed',
    status = 'accepted',
    updated_at = NOW()
WHERE client_name = 'Jean Jean' AND id = '50ff7921-c9db-40b5-b568-3e567ac5a983';