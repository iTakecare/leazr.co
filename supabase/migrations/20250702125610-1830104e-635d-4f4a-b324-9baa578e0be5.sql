-- Corriger l'association utilisateur/client avec le bon user_id
-- L'utilisateur connecté a l'ID b87a082e-4aad-48b7-860f-07fdcf42b7d1 (d'après les logs)

UPDATE public.clients 
SET 
  user_id = 'b87a082e-4aad-48b7-860f-07fdcf42b7d1',
  has_user_account = true,
  user_account_created_at = COALESCE(user_account_created_at, now()),
  updated_at = now()
WHERE id = 'b9bcc8fe-2faa-409c-9c9f-ccdc5da34a18';

-- Mettre à jour le profil utilisateur avec le client_id
UPDATE public.profiles 
SET client_id = 'b9bcc8fe-2faa-409c-9c9f-ccdc5da34a18'
WHERE id = 'b87a082e-4aad-48b7-860f-07fdcf42b7d1';

-- Vérification des données après correction
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.user_id,
  c.has_user_account,
  p.id as profile_id,
  p.client_id as profile_client_id
FROM clients c
LEFT JOIN profiles p ON c.user_id = p.id
WHERE c.id = 'b9bcc8fe-2faa-409c-9c9f-ccdc5da34a18';