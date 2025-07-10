-- Create secure function to get all clients for current user's company
CREATE OR REPLACE FUNCTION public.get_all_clients_secure()
 RETURNS TABLE(id uuid, name text, email text, company text, phone text, address text, city text, postal_code text, country text, vat_number text, notes text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, user_id uuid, has_user_account boolean, company_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_company_id uuid;
BEGIN
  -- Récupérer l'ID de l'entreprise de l'utilisateur actuel
  current_user_company_id := get_user_company_id();
  
  -- Si pas d'entreprise trouvée, ne rien retourner
  IF current_user_company_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner TOUS les clients de la même entreprise que l'utilisateur
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.company,
    c.phone,
    c.address,
    c.city,
    c.postal_code,
    c.country,
    c.vat_number,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    c.user_id,
    c.has_user_account,
    c.company_id
  FROM public.clients c
  WHERE c.company_id = current_user_company_id
  ORDER BY c.created_at DESC;
END;
$function$;