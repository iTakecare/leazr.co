CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
  v_offer RECORD;
  v_client RECORD;
  v_company RECORD;
  v_customization RECORD;
  v_equipment JSONB;
  v_result JSONB;
  v_down_payment NUMERIC;
  v_adjusted_monthly_payment NUMERIC;
  v_financed_amount NUMERIC;
BEGIN
  -- Get contract by token
  SELECT * INTO v_contract
  FROM contracts
  WHERE contract_signature_token = p_token;
  
  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;
  
  -- Get offer
  SELECT * INTO v_offer
  FROM offers
  WHERE id = v_contract.offer_id;
  
  -- Get client
  SELECT * INTO v_client
  FROM clients
  WHERE id = v_contract.client_id;
  
  -- Get company
  SELECT * INTO v_company
  FROM companies
  WHERE id = v_contract.company_id;
  
  -- Get company customizations
  SELECT * INTO v_customization
  FROM company_customizations
  WHERE company_id = v_contract.company_id;
  
  -- Get equipment with attributes and specifications
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'purchase_price', ce.purchase_price,
      'quantity', ce.quantity,
      'margin', ce.margin,
      'monthly_payment', ce.monthly_payment,
      'serial_number', ce.serial_number,
      'attributes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('key', cea.key, 'value', cea.value))
        FROM contract_equipment_attributes cea
        WHERE cea.equipment_id = ce.id
      ), '[]'::jsonb),
      'specifications', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('key', ces.key, 'value', ces.value))
        FROM contract_equipment_specifications ces
        WHERE ces.equipment_id = ce.id
      ), '[]'::jsonb)
    )
  ) INTO v_equipment
  FROM contract_equipment ce
  WHERE ce.contract_id = v_contract.id;
  
  -- Calculate down_payment, adjusted_monthly_payment, and financed_amount
  v_down_payment := COALESCE(v_offer.down_payment_percentage, 0) * COALESCE(v_offer.monthly_payment, 0);
  v_adjusted_monthly_payment := COALESCE(v_offer.monthly_payment, 0) - v_down_payment;
  v_financed_amount := v_adjusted_monthly_payment * COALESCE(v_contract.duration, v_offer.duration, 36);
  
  -- Build result
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'tracking_number', v_contract.tracking_number,
    'status', v_contract.status,
    'signature_status', v_contract.signature_status,
    'leaser_name', v_contract.leaser_name,
    'leaser_logo', v_contract.leaser_logo,
    'duration', COALESCE(v_contract.duration, v_offer.duration),
    'monthly_payment', v_contract.monthly_payment,
    'coefficient', COALESCE(v_offer.coefficient, 0),
    'financed_amount', v_financed_amount,
    'amount', COALESCE(v_offer.amount, 0),
    'down_payment', v_down_payment,
    'adjusted_monthly_payment', v_adjusted_monthly_payment,
    'contract_signature_data', v_contract.contract_signature_data,
    'contract_signer_name', v_contract.contract_signer_name,
    'contract_signer_ip', v_contract.contract_signer_ip,
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_start_date', v_contract.contract_start_date,
    'contract_end_date', v_contract.contract_end_date,
    'delivery_date', v_contract.delivery_date,
    'file_fee', COALESCE(v_offer.file_fee, 0),
    'annual_insurance', COALESCE(v_offer.annual_insurance, 0),
    'special_provisions', v_contract.special_provisions,
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
      'country', v_client.country,
      'vat_number', v_client.vat_number
    ),
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'logo_url', v_company.logo_url,
      'primary_color', v_company.primary_color
    ),
    'customization', CASE WHEN v_customization IS NOT NULL THEN jsonb_build_object(
      'company_name', v_customization.company_name,
      'company_address', v_customization.company_address,
      'company_city', v_customization.company_city,
      'company_postal_code', v_customization.company_postal_code,
      'company_country', v_customization.company_country,
      'company_email', v_customization.company_email,
      'company_phone', v_customization.company_phone,
      'company_vat_number', v_customization.company_vat_number,
      'company_bce', v_customization.company_bce,
      'logo_url', v_customization.logo_url
    ) ELSE NULL END,
    'equipment', COALESCE(v_equipment, '[]'::jsonb)
  );
  
  RETURN v_result;
END;
$function$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO authenticated;