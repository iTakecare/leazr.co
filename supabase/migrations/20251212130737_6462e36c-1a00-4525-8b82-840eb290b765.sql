-- Create RPC function to get contract for public signature page
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_signature_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_equipment JSONB;
  v_company JSONB;
BEGIN
  -- Get contract by signature token
  SELECT 
    c.id,
    c.offer_id,
    c.client_name,
    c.client_email,
    c.leaser_name,
    c.monthly_payment,
    c.contract_duration,
    c.tracking_number,
    c.signature_status,
    c.is_self_leasing,
    c.company_id,
    cl.company as client_company,
    cl.address as client_address,
    cl.city as client_city,
    cl.postal_code as client_postal_code,
    cl.vat_number as client_vat_number
  INTO v_contract
  FROM contracts c
  LEFT JOIN clients cl ON c.client_id = cl.id
  WHERE c.contract_signature_token = p_signature_token
    AND c.is_self_leasing = true;
  
  IF v_contract IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get equipment
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'quantity', ce.quantity,
      'purchase_price', ce.purchase_price,
      'monthly_payment', ce.monthly_payment
    )
  )
  INTO v_equipment
  FROM contract_equipment ce
  WHERE ce.contract_id = v_contract.id;
  
  -- Get company branding
  SELECT jsonb_build_object(
    'name', co.name,
    'logo_url', co.logo_url,
    'primary_color', co.primary_color
  )
  INTO v_company
  FROM companies co
  WHERE co.id = v_contract.company_id;
  
  RETURN jsonb_build_object(
    'id', v_contract.id,
    'offer_id', v_contract.offer_id,
    'client_name', v_contract.client_name,
    'client_company', v_contract.client_company,
    'client_email', v_contract.client_email,
    'client_address', v_contract.client_address,
    'client_city', v_contract.client_city,
    'client_postal_code', v_contract.client_postal_code,
    'client_vat_number', v_contract.client_vat_number,
    'leaser_name', v_contract.leaser_name,
    'monthly_payment', v_contract.monthly_payment,
    'contract_duration', v_contract.contract_duration,
    'tracking_number', v_contract.tracking_number,
    'signature_status', v_contract.signature_status,
    'is_self_leasing', v_contract.is_self_leasing,
    'equipment', COALESCE(v_equipment, '[]'::jsonb),
    'company', v_company
  );
END;
$$;

-- Create RPC function to sign contract publicly
CREATE OR REPLACE FUNCTION public.sign_contract_public(
  p_signature_token TEXT,
  p_signature_data TEXT,
  p_signer_name TEXT,
  p_signer_ip TEXT DEFAULT NULL,
  p_client_iban TEXT DEFAULT NULL,
  p_client_bic TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id UUID;
  v_offer_id UUID;
BEGIN
  -- Get contract ID
  SELECT id, offer_id INTO v_contract_id, v_offer_id
  FROM contracts
  WHERE contract_signature_token = p_signature_token
    AND is_self_leasing = true
    AND signature_status = 'pending_signature';
  
  IF v_contract_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contrat non trouvé ou déjà signé'
    );
  END IF;
  
  -- Update contract with signature
  UPDATE contracts
  SET 
    signature_status = 'signed',
    contract_signed_at = NOW(),
    contract_signer_name = p_signer_name,
    contract_signer_ip = p_signer_ip,
    contract_signature_data = p_signature_data,
    client_iban = p_client_iban,
    client_bic = p_client_bic,
    status = 'active',
    updated_at = NOW()
  WHERE id = v_contract_id;
  
  -- Update offer workflow status
  UPDATE offers
  SET 
    workflow_status = 'signed',
    converted_to_contract = true,
    updated_at = NOW()
  WHERE id = v_offer_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id
  );
END;
$$;

-- Grant execute permissions to anon and authenticated for public signature
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_public(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
