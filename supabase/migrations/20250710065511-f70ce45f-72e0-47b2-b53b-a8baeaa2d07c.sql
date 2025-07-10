-- Modifier les fonctions RPC pour accepter company_id en paramètre et éviter la récursion

-- Modifier la fonction get_all_clients_secure pour accepter company_id en paramètre
CREATE OR REPLACE FUNCTION public.get_all_clients_secure(p_company_id uuid)
 RETURNS TABLE(id uuid, name text, email text, company text, phone text, address text, city text, postal_code text, country text, vat_number text, notes text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, user_id uuid, has_user_account boolean, company_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Vérifier que le company_id est fourni
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner TOUS les clients de l'entreprise spécifiée
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
  WHERE c.company_id = p_company_id
  ORDER BY c.created_at DESC;
END;
$function$;

-- Modifier la fonction get_company_ambassadors_secure pour accepter company_id en paramètre
CREATE OR REPLACE FUNCTION public.get_company_ambassadors_secure(p_company_id uuid)
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
BEGIN
  -- Vérifier que le company_id est fourni
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner les ambassadeurs de l'entreprise spécifiée
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
  WHERE a.company_id = p_company_id
  ORDER BY a.created_at DESC;
END;
$$;