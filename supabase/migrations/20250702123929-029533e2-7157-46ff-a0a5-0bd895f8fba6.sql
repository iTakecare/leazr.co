-- Corriger l'association utilisateur/client
-- Mettre à jour le user_id du client pour qu'il corresponde à l'utilisateur connecté

UPDATE public.clients 
SET 
  user_id = 'bb9cc8f6-2faa-409c-9c9f-ccdc5da54a18',
  has_user_account = true,
  user_account_created_at = COALESCE(user_account_created_at, now()),
  updated_at = now()
WHERE id = 'b9bcc8fe-2faa-409c-9c9f-ccdc5da34a18';

-- Mettre à jour le profil utilisateur avec le client_id
UPDATE public.profiles 
SET client_id = 'b9bcc8fe-2faa-409c-9c9f-ccdc5da34a18'
WHERE id = 'bb9cc8f6-2faa-409c-9c9f-ccdc5da54a18';

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