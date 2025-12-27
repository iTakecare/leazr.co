-- Update get_contract_for_signature to include ALL data needed for PDF generation
-- This ensures the email download link generates the same PDF as the contract detail page

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
  v_equipment JSONB;
  v_result JSONB;
  v_down_payment NUMERIC;
  v_coefficient NUMERIC;
  v_adjusted_monthly_payment NUMERIC;
  v_financed_amount NUMERIC;
  v_leaser_name TEXT;
BEGIN
  -- Find contract by signature token
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_signature_token = p_token;
  
  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;
  
  -- Get offer info for down_payment, coefficient, and fees
  SELECT down_payment, coefficient, financed_amount, amount, file_fee, annual_insurance
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
  
  -- Get leaser name (try from leasers table first)
  v_leaser_name := v_contract.leaser_name;
  IF v_contract.leaser_id IS NOT NULL THEN
    SELECT COALESCE(company_name, name) INTO v_leaser_name
    FROM public.leasers
    WHERE id = v_contract.leaser_id;
  END IF;
  
  -- Get client info
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = v_contract.client_id;
  
  -- Get company info
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = v_contract.company_id;
  
  -- Get company customizations
  SELECT * INTO v_customization
  FROM public.company_customizations
  WHERE company_id = v_contract.company_id;
  
  -- Get equipment with attributes
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
  
  -- Build comprehensive result with ALL data needed for PDF
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'contract_number', v_contract.contract_number,
    'tracking_number', v_contract.tracking_number,
    'signature_status', v_contract.signature_status,
    'created_at', v_contract.created_at,
    -- Contract dates
    'contract_start_date', v_contract.contract_start_date,
    'contract_end_date', v_contract.contract_end_date,
    -- Signature data
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_signer_name', v_contract.contract_signer_name,
    'contract_signature_data', v_contract.contract_signature_data,
    'contract_signer_ip', v_contract.contract_signer_ip,
    -- Financial data
    'monthly_payment', v_contract.monthly_payment,
    'contract_duration', COALESCE(v_contract.contract_duration, 36),
    'down_payment', v_down_payment,
    'adjusted_monthly_payment', v_adjusted_monthly_payment,
    'coefficient', v_coefficient,
    'financed_amount', v_financed_amount,
    'amount', COALESCE(v_offer.amount, 0),
    'file_fee', COALESCE(v_offer.file_fee, v_contract.file_fee, 0),
    'annual_insurance', COALESCE(v_offer.annual_insurance, 0),
    -- Leaser
    'leaser_name', COALESCE(v_leaser_name, 'Non spécifié'),
    'is_self_leasing', v_contract.is_self_leasing,
    -- Special provisions
    'special_provisions', v_contract.special_provisions,
    -- Client info
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'company', v_client.company,
      'email', v_client.email,
      'phone', v_client.phone,
      'address', v_client.address,
      'city', v_client.city,
      'postal_code', v_client.postal_code,
      'country', COALESCE(v_client.country, 'Belgique'),
      'vat_number', v_client.vat_number
    ),
    -- Company info with customizations
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', COALESCE(v_customization.company_name, v_company.name),
      'logo_url', COALESCE(v_customization.logo_url, v_company.logo_url),
      'address', v_customization.company_address,
      'city', v_customization.company_city,
      'postal_code', v_customization.company_postal_code,
      'email', v_customization.company_email,
      'phone', v_customization.company_phone,
      'vat_number', v_customization.company_vat_number,
      'slug', v_company.slug,
      'primary_color', v_company.primary_color
    ),
    'equipment', v_equipment
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO authenticated;