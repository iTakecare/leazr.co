-- Mettre à jour le statut de l'offre pour la rendre accessible publiquement
UPDATE offers 
SET workflow_status = 'sent',
    status = 'sent',
    updated_at = NOW()
WHERE id = 'c867c9a8-3ff1-473d-9a06-95976aa7079f';