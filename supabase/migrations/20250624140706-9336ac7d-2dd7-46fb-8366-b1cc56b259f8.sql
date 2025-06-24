
-- Créer une fonction SECURITY DEFINER pour récupérer les clients d'un ambassadeur
CREATE OR REPLACE FUNCTION public.get_ambassador_clients_secure(p_user_id uuid)
RETURNS TABLE(
  client_id uuid,
  client_name text,
  client_email text,
  client_company text,
  client_phone text,
  client_address text,
  client_city text,
  client_postal_code text,
  client_country text,
  client_vat_number text,
  client_notes text,
  client_status text,
  client_created_at timestamp with time zone,
  client_updated_at timestamp with time zone,
  client_user_id uuid,
  client_has_user_account boolean,
  client_company_id uuid,
  link_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ambassador_rec RECORD;
BEGIN
  -- Vérifier que l'utilisateur a un profil ambassadeur
  SELECT id, company_id INTO ambassador_rec 
  FROM public.ambassadors 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Si pas d'ambassadeur trouvé, retourner vide
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Retourner les clients liés à cet ambassadeur
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    c.company as client_company,
    c.phone as client_phone,
    c.address as client_address,
    c.city as client_city,
    c.postal_code as client_postal_code,
    c.country as client_country,
    c.vat_number as client_vat_number,
    c.notes as client_notes,
    c.status as client_status,
    c.created_at as client_created_at,
    c.updated_at as client_updated_at,
    c.user_id as client_user_id,
    c.has_user_account as client_has_user_account,
    c.company_id as client_company_id,
    ac.created_at as link_created_at
  FROM public.ambassador_clients ac
  JOIN public.clients c ON ac.client_id = c.id
  WHERE ac.ambassador_id = ambassador_rec.id;
END;
$$;
