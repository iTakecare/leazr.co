-- Créer la fonction get_company_ambassadors_secure manquante
CREATE OR REPLACE FUNCTION public.get_company_ambassadors_secure()
 RETURNS TABLE(id uuid, name text, email text, phone text, region text, status text, notes text, address text, city text, postal_code text, country text, company text, vat_number text, has_user_account boolean, user_id uuid, user_account_created_at timestamp with time zone, updated_at timestamp with time zone, created_at timestamp with time zone, last_commission numeric, commissions_total numeric, clients_count integer, commission_level_id uuid, company_id uuid, pdf_template_id text)
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
  
  -- Retourner TOUS les ambassadeurs de la même entreprise que l'utilisateur
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.email,
    a.phone,
    a.region,
    a.status,
    a.notes,
    a.address,
    a.city,
    a.postal_code,
    a.country,
    a.company,
    a.vat_number,
    a.has_user_account,
    a.user_id,
    a.user_account_created_at,
    a.updated_at,
    a.created_at,
    a.last_commission,
    a.commissions_total,
    a.clients_count,
    a.commission_level_id,
    a.company_id,
    a.pdf_template_id
  FROM public.ambassadors a
  WHERE a.company_id = current_user_company_id
  ORDER BY a.created_at DESC;
END;
$function$;