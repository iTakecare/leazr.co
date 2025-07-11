-- Créer la fonction get_company_partners_secure manquante
CREATE OR REPLACE FUNCTION public.get_company_partners_secure()
 RETURNS TABLE(id uuid, name text, contact_name text, email text, phone text, type text, status text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, clients_count integer, revenue_total numeric, last_transaction numeric, commission_level_id uuid, has_user_account boolean, user_account_created_at timestamp with time zone, user_id uuid, company_id uuid)
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
  
  -- Retourner TOUS les partenaires de la même entreprise que l'utilisateur
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.contact_name,
    p.email,
    p.phone,
    p.type,
    p.status,
    p.notes,
    p.created_at,
    p.updated_at,
    p.clients_count,
    p.revenue_total,
    p.last_transaction,
    p.commission_level_id,
    p.has_user_account,
    p.user_account_created_at,
    p.user_id,
    p.company_id
  FROM public.partners p
  WHERE p.company_id = current_user_company_id
  ORDER BY p.created_at DESC;
END;
$function$;