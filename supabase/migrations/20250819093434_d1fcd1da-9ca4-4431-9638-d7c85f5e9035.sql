-- Supprimer la fonction problématique create_company_user qui utilise gen_salt()
DROP FUNCTION IF EXISTS public.create_company_user(text, text, text, text, text, uuid);

-- Supprimer aussi create_company_with_admin si elle existe et pose problème
DROP FUNCTION IF EXISTS public.create_company_with_admin(text, text, text, text, text, text);