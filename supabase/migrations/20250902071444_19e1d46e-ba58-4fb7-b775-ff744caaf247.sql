-- Mise à jour des collaborateurs principaux avec les informations manquantes du client
-- Cette migration copie l'email et le téléphone du client vers le collaborateur principal
-- quand ces informations sont manquantes sur le collaborateur

UPDATE collaborators 
SET 
  email = COALESCE(NULLIF(collaborators.email, ''), clients.email),
  phone = COALESCE(NULLIF(collaborators.phone, ''), clients.phone),
  updated_at = now()
FROM clients
WHERE collaborators.client_id = clients.id 
  AND collaborators.is_primary = true
  AND (
    collaborators.email IS NULL 
    OR collaborators.email = '' 
    OR collaborators.phone IS NULL 
    OR collaborators.phone = ''
  )
  AND (
    clients.email IS NOT NULL 
    OR clients.phone IS NOT NULL
  );