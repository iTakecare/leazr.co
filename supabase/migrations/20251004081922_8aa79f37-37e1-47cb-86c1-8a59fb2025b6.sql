-- Supprimer l'utilisateur 9e562794-61d6-4336-8671-13d1eb56f25a et ses données associées

DO $$
DECLARE
  user_id_to_delete UUID := '9e562794-61d6-4336-8671-13d1eb56f25a';
BEGIN
  -- Nettoyer les références dans clients
  UPDATE public.clients SET user_id = NULL WHERE user_id = user_id_to_delete;
  
  -- Nettoyer les références dans ambassadors
  UPDATE public.ambassadors SET user_id = NULL WHERE user_id = user_id_to_delete;
  
  -- Supprimer le profil
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  -- Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RAISE NOTICE 'Utilisateur supprimé avec succès';
END $$;