-- Supprimer les utilisateurs spécifiques et leurs données associées

DO $$
DECLARE
  user_id_1 UUID := '1cdcc1d0-3e1a-41a5-aa1e-fa9a936de668';
  user_id_2 UUID := 'f4421471-bf5f-4948-9216-4172c968108a';
BEGIN
  -- Nettoyer les références dans clients
  UPDATE public.clients SET user_id = NULL WHERE user_id IN (user_id_1, user_id_2);
  
  -- Nettoyer les références dans ambassadors
  UPDATE public.ambassadors SET user_id = NULL WHERE user_id IN (user_id_1, user_id_2);
  
  -- Supprimer les profils
  DELETE FROM public.profiles WHERE id IN (user_id_1, user_id_2);
  
  -- Supprimer les utilisateurs de auth.users
  DELETE FROM auth.users WHERE id IN (user_id_1, user_id_2);
  
  RAISE NOTICE 'Utilisateurs supprimés avec succès';
END $$;