-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_contract_for_signature(uuid);

-- Recreate with JSONB return type
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_offer RECORD;
  v_client RECORD;
  v_company RECORD;
  v_company_customization RECORD;
  v_leaser RECORD;
  v_equipment JSONB;
  v_result JSONB;
BEGIN
  -- Get contract by signature token
  SELECT * INTO v_contract
  FROM contracts
  WHERE contract_signature_token = p_token;

  IF v_contract.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;

  -- Get associated offer
  SELECT * INTO v_offer
  FROM offers
  WHERE id = v_contract.offer_id;

  -- Get client info
  SELECT * INTO v_client
  FROM clients
  WHERE id = v_contract.client_id;

  -- Get company info
  SELECT * INTO v_company
  FROM companies
  WHERE id = v_contract.company_id;

  -- Get company customizations
  SELECT * INTO v_company_customization
  FROM company_customizations
  WHERE company_id = v_contract.company_id;

  -- Get leaser info if applicable
  IF v_contract.leaser_id IS NOT NULL THEN
    SELECT * INTO v_leaser
    FROM leasers
    WHERE id = v_contract.leaser_id;
  END IF;

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

  -- Build result with all necessary data for PDF generation
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'tracking_number', v_contract.tracking_number,
    'status', v_contract.status,
    'created_at', v_contract.created_at,
    'updated_at', v_contract.updated_at,
    'signature_status', v_contract.signature_status,
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_signature_data', v_contract.contract_signature_data,
    'contract_signer_name', v_contract.contract_signer_name,
    'contract_signer_ip', v_contract.contract_signer_ip,
    'leaser_name', v_contract.leaser_name,
    'leaser_logo', v_contract.leaser_logo,
    'monthly_payment', v_contract.monthly_payment,
    'coefficient', v_contract.coefficient,
    'delivery_date', v_contract.delivery_date,
    'contract_start_date', v_contract.contract_start_date,
    'contract_end_date', v_contract.contract_end_date,
    'remarks', v_contract.remarks,
    'client_iban', v_contract.client_iban,
    'client_bic', v_contract.client_bic,
    
    -- Financial fields from offer
    'financed_amount', COALESCE(v_offer.financed_amount, v_offer.amount),
    'commission', v_offer.commission,
    'file_fee', COALESCE(v_offer.file_fee, 0),
    'annual_insurance', COALESCE(v_offer.annual_insurance, 0),
    'down_payment', COALESCE(v_offer.down_payment, 0),
    'contract_duration', COALESCE(v_offer.duration, 36),
    
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
      'country', v_client.country,
      'vat_number', v_client.vat_number,
      'contact_name', v_client.contact_name
    ),
    
    -- Company info
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'logo_url', v_company.logo_url,
      'primary_color', v_company.primary_color
    ),
    
    -- Company customizations
    'company_customization', CASE 
      WHEN v_company_customization.id IS NOT NULL THEN
        jsonb_build_object(
          'company_name', v_company_customization.company_name,
          'company_address', v_company_customization.company_address,
          'company_city', v_company_customization.company_city,
          'company_postal_code', v_company_customization.company_postal_code,
          'company_country', v_company_customization.company_country,
          'company_email', v_company_customization.company_email,
          'company_phone', v_company_customization.company_phone,
          'company_vat_number', v_company_customization.company_vat_number,
          'company_bce', v_company_customization.company_bce,
          'company_legal_form', v_company_customization.company_legal_form,
          'logo_url', v_company_customization.logo_url
        )
      ELSE NULL
    END,
    
    -- Leaser info
    'leaser', CASE 
      WHEN v_leaser.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_leaser.id,
          'name', v_leaser.name,
          'logo_url', v_leaser.logo_url,
          'is_own_company', v_leaser.is_own_company
        )
      ELSE NULL
    END,
    
    -- Equipment
    'equipment', COALESCE(v_equipment, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;