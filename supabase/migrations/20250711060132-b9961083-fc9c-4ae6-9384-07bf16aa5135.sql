-- Supprimer les anciennes versions de fonctions avec paramètres pour éliminer les warnings "Function Search Path Mutable"
-- Garder seulement les versions sécurisées sans paramètres qui ont SET search_path = 'public'

-- Supprimer l'ancienne version de get_company_dashboard_metrics avec paramètres
DROP FUNCTION IF EXISTS public.get_company_dashboard_metrics(uuid, text);

-- Supprimer l'ancienne version de get_company_recent_activity avec paramètres  
DROP FUNCTION IF EXISTS public.get_company_recent_activity(uuid, integer);