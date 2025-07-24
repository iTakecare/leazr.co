-- Modify the get_all_clients_secure function to include calculated is_ambassador_client field
CREATE OR REPLACE FUNCTION public.get_all_clients_secure()
 RETURNS TABLE(
   id uuid, 
   name text, 
   email text, 
   company text, 
   phone text, 
   address text, 
   city text, 
   postal_code text, 
   country text, 
   vat_number text, 
   notes text, 
   status text, 
   created_at timestamp with time zone, 
   updated_at timestamp with time zone, 
   user_id uuid, 
   has_user_account boolean, 
   company_id uuid,
   is_ambassador_client boolean
 )
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
  
  -- Retourner TOUS les clients de la même entreprise que l'utilisateur avec le statut d'ambassadeur calculé
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
    c.company_id,
    CASE 
      WHEN ac.client_id IS NOT NULL THEN true 
      ELSE false 
    END as is_ambassador_client
  FROM public.clients c
  LEFT JOIN public.ambassador_clients ac ON c.id = ac.client_id
  WHERE c.company_id = current_user_company_id
  ORDER BY c.created_at DESC;
END;
$function$;