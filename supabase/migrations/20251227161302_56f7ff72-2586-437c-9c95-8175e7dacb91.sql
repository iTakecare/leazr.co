-- Drop existing function first (to change return type)
DROP FUNCTION IF EXISTS public.get_contract_for_signature(uuid);

-- Recreate with JSONB return type and contract_number included
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_signature_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_company RECORD;
  v_client RECORD;
  v_equipment JSONB;
  v_result JSONB;
BEGIN
  -- Get contract by signature token (all contracts, not just self-leasing)
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_signature_token = p_signature_token
    AND (signature_status IS NULL OR signature_status IN ('pending_signature', 'draft'));
  
  IF v_contract IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get company info
  SELECT 
    c.id,
    c.name,
    c.logo_url,
    c.primary_color,
    cc.company_name,
    cc.company_address,
    cc.company_city,
    cc.company_postal_code,
    cc.company_vat_number,
    cc.company_email,
    cc.company_phone
  INTO v_company
  FROM public.companies c
  LEFT JOIN public.company_customizations cc ON cc.company_id = c.id
  WHERE c.id = v_contract.company_id;
  
  -- Get client info
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = v_contract.client_id;
  
  -- Get equipment
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'quantity', ce.quantity,
      'purchase_price', ce.purchase_price,
      'monthly_payment', ce.monthly_payment
    )
  ), '[]'::jsonb) INTO v_equipment
  FROM public.contract_equipment ce
  WHERE ce.contract_id = v_contract.id;
  
  -- Build result with contract_number
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'offer_id', v_contract.offer_id,
    'client_name', COALESCE(v_client.contact_name, v_client.name, v_contract.client_name),
    'client_company', COALESCE(v_client.company, v_client.name),
    'client_email', COALESCE(v_client.email, v_contract.client_email),
    'client_address', COALESCE(v_client.billing_address, v_client.address),
    'client_city', COALESCE(v_client.billing_city, v_client.city),
    'client_postal_code', COALESCE(v_client.billing_postal_code, v_client.postal_code),
    'client_vat_number', v_client.vat_number,
    'leaser_name', v_contract.leaser_name,
    'monthly_payment', v_contract.monthly_payment,
    'contract_duration', COALESCE(v_contract.lease_duration, 36),
    'tracking_number', COALESCE(v_contract.contract_number, v_contract.tracking_number, 'CON-' || LEFT(v_contract.id::text, 8)),
    'contract_number', v_contract.contract_number,
    'signature_status', v_contract.signature_status,
    'is_self_leasing', COALESCE(v_contract.is_self_leasing, false),
    'company', jsonb_build_object(
      'name', COALESCE(v_company.company_name, v_company.name),
      'logo_url', v_company.logo_url,
      'primary_color', v_company.primary_color
    ),
    'equipment', v_equipment
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute to public (for signature page)
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO authenticated;