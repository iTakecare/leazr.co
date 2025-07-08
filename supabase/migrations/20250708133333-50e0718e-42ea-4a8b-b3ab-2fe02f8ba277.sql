-- Désactiver temporairement le trigger pour diagnostiquer le problème
-- Cela permettra la création d'utilisateur sans déclencher notre trigger

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- On va aussi supprimer la fonction pour éviter tout conflit
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Note: Nous recréerons le trigger une fois que nous aurons identifié le problème