-- Drop the existing broken function first
DROP FUNCTION IF EXISTS public.get_contract_for_signature(uuid);

-- Recreate the function with correct definition
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
  v_customization RECORD;
  v_leaser RECORD;
  v_equipment JSONB;
  v_result JSONB;
  v_coefficient NUMERIC;
  v_monthly_payment NUMERIC;
  v_commission NUMERIC;
  v_financed_amount NUMERIC;
  v_total_monthly_payment NUMERIC;
  v_residual_value NUMERIC;
  v_residual_value_percentage NUMERIC;
  v_global_margin_amount NUMERIC;
  v_margin_with_difference NUMERIC;
  v_down_payment NUMERIC;
  v_contract_template RECORD;
BEGIN
  -- Find contract by signature token
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_signature_token = p_token;
  
  IF v_contract IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get offer data for coefficient and other financial fields
  IF v_contract.offer_id IS NOT NULL THEN
    SELECT * INTO v_offer
    FROM public.offers
    WHERE id = v_contract.offer_id;
    
    v_coefficient := COALESCE(v_offer.coefficient, 0);
    v_monthly_payment := COALESCE(v_offer.monthly_payment, v_contract.monthly_payment, 0);
    v_commission := COALESCE(v_offer.commission, 0);
    v_down_payment := COALESCE(v_offer.down_payment, 0);
  ELSE
    v_coefficient := 0;
    v_monthly_payment := COALESCE(v_contract.monthly_payment, 0);
    v_commission := 0;
    v_down_payment := 0;
  END IF;
  
  -- Get client data
  IF v_contract.client_id IS NOT NULL THEN
    SELECT * INTO v_client
    FROM public.clients
    WHERE id = v_contract.client_id;
  END IF;
  
  -- Get company data
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = v_contract.company_id;
  
  -- Get company customizations
  SELECT * INTO v_customization
  FROM public.company_customizations
  WHERE company_id = v_contract.company_id;
  
  -- Get leaser data
  IF v_contract.leaser_id IS NOT NULL THEN
    SELECT * INTO v_leaser
    FROM public.leasers
    WHERE id = v_contract.leaser_id;
  END IF;
  
  -- Get contract template
  IF v_contract.contract_template_id IS NOT NULL THEN
    SELECT * INTO v_contract_template
    FROM public.contract_templates
    WHERE id = v_contract.contract_template_id;
  END IF;
  
  -- Get equipment as JSONB array
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'purchase_price', ce.purchase_price,
      'quantity', ce.quantity,
      'monthly_payment', ce.monthly_payment,
      'serial_number', ce.serial_number,
      'margin', ce.margin,
      'attributes', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('key', cea.key, 'value', cea.value)
        ), '[]'::jsonb)
        FROM public.contract_equipment_attributes cea
        WHERE cea.equipment_id = ce.id
      )
    )
  ), '[]'::jsonb) INTO v_equipment
  FROM public.contract_equipment ce
  WHERE ce.contract_id = v_contract.id;
  
  -- Calculate financial values
  v_financed_amount := COALESCE(v_contract.financed_amount, v_contract.amount, 0);
  v_total_monthly_payment := v_monthly_payment;
  v_residual_value_percentage := COALESCE(v_contract.residual_value_percentage, 0);
  v_residual_value := v_financed_amount * (v_residual_value_percentage / 100);
  v_global_margin_amount := COALESCE(v_contract.global_margin_amount, 0);
  v_margin_with_difference := v_global_margin_amount;
  
  -- Build result
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'client_name', v_contract.client_name,
    'client_email', v_contract.client_email,
    'tracking_number', v_contract.tracking_number,
    'amount', v_contract.amount,
    'monthly_payment', v_monthly_payment,
    'coefficient', v_coefficient,
    'commission', v_commission,
    'down_payment', v_down_payment,
    'financed_amount', v_financed_amount,
    'total_monthly_payment', v_total_monthly_payment,
    'residual_value', v_residual_value,
    'residual_value_percentage', v_residual_value_percentage,
    'global_margin_amount', v_global_margin_amount,
    'margin_with_difference', v_margin_with_difference,
    'contract_duration', v_contract.contract_duration,
    'contract_start_date', v_contract.contract_start_date,
    'contract_end_date', v_contract.contract_end_date,
    'workflow_status', v_contract.workflow_status,
    'type', v_contract.type,
    'leaser_id', v_contract.leaser_id,
    'offer_id', v_contract.offer_id,
    'contract_template_id', v_contract.contract_template_id,
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_signer_name', v_contract.contract_signer_name,
    'contract_signature_data', v_contract.contract_signature_data,
    'signed_contract_pdf_url', v_contract.signed_contract_pdf_url,
    'client', CASE WHEN v_client IS NOT NULL THEN jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'email', v_client.email,
      'company', v_client.company,
      'vat_number', v_client.vat_number,
      'address', v_client.address,
      'city', v_client.city,
      'postal_code', v_client.postal_code,
      'country', v_client.country,
      'phone', v_client.phone,
      'billing_address', v_client.billing_address,
      'billing_city', v_client.billing_city,
      'billing_postal_code', v_client.billing_postal_code,
      'billing_country', v_client.billing_country
    ) ELSE NULL END,
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'logo_url', v_company.logo_url
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
      'company_legal_form', v_customization.company_legal_form,
      'company_bce', v_customization.company_bce,
      'logo_url', v_customization.logo_url
    ) ELSE NULL END,
    'leaser', CASE WHEN v_leaser IS NOT NULL THEN jsonb_build_object(
      'id', v_leaser.id,
      'name', v_leaser.name,
      'logo_url', v_leaser.logo_url
    ) ELSE NULL END,
    'contract_template', CASE WHEN v_contract_template IS NOT NULL THEN jsonb_build_object(
      'id', v_contract_template.id,
      'name', v_contract_template.name,
      'parsed_content', v_contract_template.parsed_content
    ) ELSE NULL END,
    'equipment', v_equipment
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO authenticated;