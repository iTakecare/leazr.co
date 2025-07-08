-- Corriger définitivement l'erreur "Database error saving new user"
-- Le problème : les triggers sur auth.users échouent et bloquent la création d'utilisateur

-- 1. Supprimer les triggers problématiques qui bloquent la création d'utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created_link_client ON auth.users;
DROP TRIGGER IF EXISTS on_user_signup_link_client ON auth.users;

-- 2. Désactiver temporairement la fonction de liaison automatique
-- (elle peut être réactivée plus tard avec une approche différée)
DROP FUNCTION IF EXISTS public.link_user_to_client_on_signup();

-- Note: La liaison utilisateur-client sera implémentée différemment
-- après que l'inscription de base fonctionne correctement