-- Update get_contract_for_signature to include down_payment and adjusted_monthly_payment
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_offer RECORD;
  v_client RECORD;
  v_company RECORD;
  v_equipment JSONB;
  v_result JSONB;
  v_down_payment NUMERIC;
  v_coefficient NUMERIC;
  v_adjusted_monthly_payment NUMERIC;
  v_financed_amount NUMERIC;
BEGIN
  -- Find contract by signature token
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_signature_token = p_token;
  
  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;
  
  -- Get offer info for down_payment and coefficient (for self-leasing)
  SELECT down_payment, coefficient, financed_amount, amount 
  INTO v_offer
  FROM public.offers
  WHERE id = v_contract.offer_id;
  
  -- Calculate down_payment and adjusted monthly payment
  v_down_payment := COALESCE(v_offer.down_payment, 0);
  v_coefficient := COALESCE(v_offer.coefficient, 0);
  v_financed_amount := COALESCE(v_offer.financed_amount, v_offer.amount, 0);
  
  -- Calculate adjusted monthly payment if down_payment exists and is self-leasing
  IF v_down_payment > 0 AND v_coefficient > 0 AND v_contract.is_self_leasing = true THEN
    v_adjusted_monthly_payment := ROUND(((v_financed_amount - v_down_payment) * v_coefficient) / 100, 2);
  ELSE
    v_adjusted_monthly_payment := v_contract.monthly_payment;
  END IF;
  
  -- Get client info
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = v_contract.client_id;
  
  -- Get company info
  SELECT c.*, cc.company_name as customization_name, cc.company_address, cc.company_city, 
         cc.company_postal_code, cc.company_email, cc.company_phone, cc.logo_url as custom_logo
  INTO v_company
  FROM public.companies c
  LEFT JOIN public.company_customizations cc ON cc.company_id = c.id
  WHERE c.id = v_contract.company_id;
  
  -- Get equipment
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'quantity', ce.quantity,
      'monthly_payment', ce.monthly_payment,
      'purchase_price', ce.purchase_price,
      'margin', ce.margin,
      'serial_number', ce.serial_number
    )
  ), '[]'::jsonb) INTO v_equipment
  FROM public.contract_equipment ce
  WHERE ce.contract_id = v_contract.id;
  
  -- Build result with down_payment and adjusted_monthly_payment
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'contract_number', v_contract.contract_number,
    'tracking_number', v_contract.tracking_number,
    'signature_status', v_contract.signature_status,
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_signer_name', v_contract.contract_signer_name,
    'monthly_payment', v_contract.monthly_payment,
    'contract_duration', COALESCE(v_contract.contract_duration, 36),
    'leaser_name', v_contract.leaser_name,
    'is_self_leasing', v_contract.is_self_leasing,
    'down_payment', v_down_payment,
    'adjusted_monthly_payment', v_adjusted_monthly_payment,
    'created_at', v_contract.created_at,
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'company', v_client.company,
      'email', v_client.email,
      'phone', v_client.phone,
      'address', v_client.address,
      'city', v_client.city,
      'postal_code', v_client.postal_code,
      'vat_number', v_client.vat_number
    ),
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', COALESCE(v_company.customization_name, v_company.name),
      'logo_url', COALESCE(v_company.custom_logo, v_company.logo_url),
      'address', v_company.company_address,
      'city', v_company.company_city,
      'postal_code', v_company.company_postal_code,
      'email', v_company.company_email,
      'phone', v_company.company_phone,
      'slug', v_company.slug
    ),
    'equipment', v_equipment
  );
  
  RETURN v_result;
END;
$$;