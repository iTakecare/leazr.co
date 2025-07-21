
-- Recréer la fonction RPC get_company_by_slug qui a été supprimée lors des reverts
CREATE OR REPLACE FUNCTION public.get_company_by_slug(company_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.accent_color
  FROM public.companies c
  WHERE c.slug = company_slug
  AND c.is_active = true
  LIMIT 1;
END;
$function$;
