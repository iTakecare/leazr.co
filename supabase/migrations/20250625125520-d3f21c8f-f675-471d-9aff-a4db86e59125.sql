
-- Créer une fonction RLS sécurisée pour récupérer les clients libres
CREATE OR REPLACE FUNCTION public.get_free_clients_secure()
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
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Retourner les clients qui ne sont PAS dans la table ambassador_clients
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ambassador_clients ac 
    WHERE ac.client_id = c.id
  )
  ORDER BY c.created_at DESC;
END;
$$;
