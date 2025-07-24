-- Corriger les fonctions pour éliminer l'avertissement search_path mutable
-- Il faut utiliser search_path = '' et préfixer les tables avec public.

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(
  user_id uuid,
  company_id uuid,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.company_id,
    p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$;

-- Mettre à jour la fonction get_user_company_id avec search_path correct
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.get_current_user_profile() LIMIT 1;
$$;