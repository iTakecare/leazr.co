BEGIN;

-- La RPC get_all_clients_secure() est utilisée par le listing CRM mais sa
-- liste de colonnes hardcodée n'inclut pas les nouveaux champs KYC. On la
-- recrée pour exposer entity_type, legal_form, company_creation_date,
-- business_sector, kyc_validated_at, kyc_score, kyc_score_reasons.

DROP FUNCTION IF EXISTS public.get_all_clients_secure();

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
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  has_user_account boolean,
  company_id uuid,
  is_ambassador_client boolean,
  -- Nouveaux champs KYC
  entity_type text,
  legal_form text,
  company_creation_date date,
  business_sector text,
  kyc_validated_at timestamptz,
  kyc_score text,
  kyc_score_reasons jsonb,
  kyc_score_computed_at timestamptz,
  young_company_relaunched_at timestamptz,
  first_name text,
  last_name text,
  contact_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_company_id uuid;
BEGIN
  current_user_company_id := get_user_company_id();

  IF current_user_company_id IS NULL THEN
    RETURN;
  END IF;

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
    CASE WHEN ac.client_id IS NOT NULL THEN true ELSE false END AS is_ambassador_client,
    c.entity_type,
    c.legal_form,
    c.company_creation_date,
    c.business_sector,
    c.kyc_validated_at,
    c.kyc_score,
    c.kyc_score_reasons,
    c.kyc_score_computed_at,
    c.young_company_relaunched_at,
    c.first_name,
    c.last_name,
    c.contact_name
  FROM public.clients c
  LEFT JOIN public.ambassador_clients ac ON c.id = ac.client_id
  WHERE c.company_id = current_user_company_id
  ORDER BY c.created_at DESC;
END;
$function$;

COMMIT;
