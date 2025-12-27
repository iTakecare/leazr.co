CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract contracts%ROWTYPE;
  v_client clients%ROWTYPE;
  v_company companies%ROWTYPE;
  v_offer offers%ROWTYPE;
  v_leaser leasers%ROWTYPE;
  v_customization company_customizations%ROWTYPE;
  v_equipment jsonb;
  v_template_content text;
  v_result jsonb;
BEGIN
  -- Fetch the contract by signature token
  SELECT * INTO v_contract
  FROM contracts
  WHERE signature_token = p_token
    AND signature_token_expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contract not found or token expired');
  END IF;

  -- Fetch related client
  SELECT * INTO v_client
  FROM clients
  WHERE id = v_contract.client_id;

  -- Fetch related company
  SELECT * INTO v_company
  FROM companies
  WHERE id = v_client.company_id;

  -- Fetch offer if exists
  SELECT * INTO v_offer
  FROM offers
  WHERE id = v_contract.offer_id;

  -- Fetch leaser if exists
  SELECT * INTO v_leaser
  FROM leasers
  WHERE id = v_contract.leaser_id;

  -- Fetch company customizations
  SELECT * INTO v_customization
  FROM company_customizations
  WHERE company_id = v_company.id;

  -- Fetch equipment as JSON array
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'quantity', ce.quantity,
      'purchase_price', ce.purchase_price,
      'monthly_payment', ce.monthly_payment,
      'serial_number', ce.serial_number,
      'attributes', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('key', cea.key, 'value', cea.value)), '[]'::jsonb)
        FROM contract_equipment_attributes cea
        WHERE cea.equipment_id = ce.id
      )
    )
  ), '[]'::jsonb) INTO v_equipment
  FROM contract_equipment ce
  WHERE ce.contract_id = v_contract.id;

  -- Fetch contract template content if exists
  SELECT parsed_content INTO v_template_content
  FROM contract_templates
  WHERE id = v_contract.contract_template_id
    AND is_active = true;

  -- Build the flat result object
  v_result := jsonb_build_object(
    -- Contract fields
    'id', v_contract.id,
    'tracking_number', v_contract.tracking_number,
    'status', v_contract.status,
    'workflow_status', v_contract.workflow_status,
    'monthly_payment', v_contract.monthly_payment,
    'coefficient', COALESCE(v_offer.coefficient, 0),
    'created_at', v_contract.created_at,
    'signed_at', v_contract.signed_at,
    'signer_name', v_contract.signer_name,
    'signer_ip', v_contract.signer_ip,
    'signature_data', v_contract.signature_data,
    'equipment_description', v_contract.equipment_description,
    'remarks', v_contract.remarks,
    
    -- Client fields (prefixed)
    'client_id', v_client.id,
    'client_name', v_client.name,
    'client_email', v_client.email,
    'client_company', v_client.company,
    'client_address', v_client.address,
    'client_city', v_client.city,
    'client_postal_code', v_client.postal_code,
    'client_country', v_client.country,
    'client_phone', v_client.phone,
    'client_vat_number', v_client.vat_number,
    'client_iban', COALESCE(v_offer.client_iban, ''),
    'client_bic', COALESCE(v_offer.client_bic, ''),
    
    -- Company fields (prefixed)
    'company_id', v_company.id,
    'company_name', v_company.name,
    'company_logo_url', v_company.logo_url,
    'company_primary_color', v_company.primary_color,
    'company_secondary_color', v_company.secondary_color,
    
    -- Customization fields
    'customization_company_name', v_customization.company_name,
    'customization_company_address', v_customization.company_address,
    'customization_company_city', v_customization.company_city,
    'customization_company_postal_code', v_customization.company_postal_code,
    'customization_company_country', v_customization.company_country,
    'customization_company_email', v_customization.company_email,
    'customization_company_phone', v_customization.company_phone,
    'customization_company_vat_number', v_customization.company_vat_number,
    'customization_logo_url', v_customization.logo_url,
    
    -- Leaser fields (prefixed)
    'leaser_id', v_leaser.id,
    'leaser_name', v_leaser.name,
    'leaser_logo_url', v_leaser.logo_url,
    
    -- Offer fields
    'offer_id', v_offer.id,
    'offer_amount', v_offer.amount,
    
    -- Equipment array
    'equipment', v_equipment,
    
    -- Template content
    'template_content', COALESCE(v_template_content, '')
  );

  RETURN v_result;
END;
$$;