
-- Créer une fonction sécurisée pour récupérer les ambassadeurs de l'entreprise
-- Cette fonction utilise SECURITY DEFINER pour contourner les problèmes RLS
-- Même pattern que get_free_clients_secure qui fonctionne déjà

CREATE OR REPLACE FUNCTION public.get_company_ambassadors_secure()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text,
  company text,
  vat_number text,
  notes text,
  status text,
  commission_level_id uuid,
  company_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid,
  has_user_account boolean,
  user_account_created_at timestamp with time zone,
  clients_count integer,
  commissions_total numeric,
  last_commission numeric,
  region text,
  pdf_template_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_company_id uuid;
BEGIN
  -- Récupérer l'ID de l'entreprise de l'utilisateur actuel
  current_user_company_id := get_user_company_id();
  
  -- Si pas d'entreprise trouvée, ne rien retourner
  IF current_user_company_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner les ambassadeurs de la même entreprise que l'utilisateur
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.email,
    a.phone,
    a.address,
    a.city,
    a.postal_code,
    a.country,
    a.company,
    a.vat_number,
    a.notes,
    a.status,
    a.commission_level_id,
    a.company_id,
    a.created_at,
    a.updated_at,
    a.user_id,
    a.has_user_account,
    a.user_account_created_at,
    a.clients_count,
    a.commissions_total,
    a.last_commission,
    a.region,
    a.pdf_template_id
  FROM public.ambassadors a
  WHERE a.company_id = current_user_company_id
  ORDER BY a.created_at DESC;
END;
$$;
