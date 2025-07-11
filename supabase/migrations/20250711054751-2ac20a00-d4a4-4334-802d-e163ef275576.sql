-- Supprimer la vue non utilisée qui cause l'erreur "Security Definer View"
-- Cette vue permet l'accès à des statistiques sur toutes les entreprises sans restrictions
-- et n'est pas utilisée dans le code applicatif

DROP VIEW IF EXISTS public.company_data_isolation_check;