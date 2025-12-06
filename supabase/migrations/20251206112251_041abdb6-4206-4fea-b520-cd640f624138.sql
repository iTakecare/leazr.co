-- Supprimer l'ancienne fonction et la recréer avec les calculs dynamiques
DROP FUNCTION IF EXISTS public.get_company_ambassadors_secure();

CREATE OR REPLACE FUNCTION public.get_company_ambassadors_secure()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  region text,
  status text,
  notes text,
  address text,
  city text,
  postal_code text,
  country text,
  company text,
  vat_number text,
  has_user_account boolean,
  user_id uuid,
  user_account_created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_at timestamp with time zone,
  last_commission numeric,
  commissions_total numeric,
  clients_count integer,
  commission_level_id uuid,
  company_id uuid,
  pdf_template_id text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id uuid;
BEGIN
  current_user_company_id := get_user_company_id();
  
  IF current_user_company_id IS NULL THEN
    RETURN;
  END IF;
  
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
    -- Calcul dynamique des commissions totales
    COALESCE((
      SELECT SUM(o.commission) 
      FROM offers o 
      WHERE o.ambassador_id = a.id 
        AND o.commission IS NOT NULL 
        AND o.commission > 0
    ), 0)::numeric as commissions_total,
    -- Calcul dynamique du nombre de clients
    COALESCE((
      SELECT COUNT(DISTINCT ac.client_id)
      FROM ambassador_clients ac 
      WHERE ac.ambassador_id = a.id
    ), 0)::integer as clients_count,
    a.commission_level_id,
    a.company_id,
    a.pdf_template_id,
    a.first_name,
    a.last_name
  FROM ambassadors a
  WHERE a.company_id = current_user_company_id
  ORDER BY a.name;
END;
$$;