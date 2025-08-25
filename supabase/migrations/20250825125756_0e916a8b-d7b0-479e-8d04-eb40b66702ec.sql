-- Corriger l'avertissement de sécurité sur la fonction

DROP FUNCTION IF EXISTS public.get_companies_with_active_upload_tokens();

-- Créer la fonction avec search_path sécurisé
CREATE OR REPLACE FUNCTION public.get_companies_with_active_upload_tokens()
RETURNS TABLE(company_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT DISTINCT oul.offer_id as company_id
  FROM public.offer_upload_links oul
  WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL;
$$;