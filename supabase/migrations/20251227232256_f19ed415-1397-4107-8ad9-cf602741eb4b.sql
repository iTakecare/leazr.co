CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_contract contracts%ROWTYPE;
  v_offer offers%ROWTYPE;
  v_client clients%ROWTYPE;
  v_company companies%ROWTYPE;
  v_company_customization company_customizations%ROWTYPE;
  v_leaser leasers%ROWTYPE;
  v_equipment JSON;
  v_result JSON;
  v_contract_duration INTEGER;
BEGIN
  -- Récupérer le contrat via le token
  SELECT * INTO v_contract
  FROM contracts
  WHERE contract_signature_token = p_token;

  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'Contrat non trouvé';
  END IF;

  -- Récupérer l'offre associée
  SELECT * INTO v_offer
  FROM offers
  WHERE id = v_contract.offer_id;

  -- Récupérer le client
  SELECT * INTO v_client
  FROM clients
  WHERE id = v_contract.client_id;

  -- Récupérer la company
  SELECT * INTO v_company
  FROM companies
  WHERE id = v_contract.company_id;

  -- Récupérer les customizations
  SELECT * INTO v_company_customization
  FROM company_customizations
  WHERE company_id = v_contract.company_id;

  -- Récupérer le leaser si présent
  IF v_contract.leaser_id IS NOT NULL THEN
    SELECT * INTO v_leaser
    FROM leasers
    WHERE id = v_contract.leaser_id;
  END IF;

  -- Récupérer les équipements
  SELECT json_agg(
    json_build_object(
      'id', ce.id,
      'title', ce.title,
      'quantity', ce.quantity,
      'purchase_price', ce.purchase_price,
      'monthly_payment', ce.monthly_payment,
      'margin', ce.margin,
      'serial_number', ce.serial_number,
      'attributes', (
        SELECT json_agg(json_build_object('key', cea.key, 'value', cea.value))
        FROM contract_equipment_attributes cea
        WHERE cea.equipment_id = ce.id
      ),
      'specifications', (
        SELECT json_agg(json_build_object('key', ces.key, 'value', ces.value))
        FROM contract_equipment_specifications ces
        WHERE ces.equipment_id = ce.id
      )
    )
  ) INTO v_equipment
  FROM contract_equipment ce
  WHERE ce.contract_id = v_contract.id;

  -- Durée calculée (on la conserve pour compatibilité), mais on renvoie aussi la durée "raw" du contrat
  v_contract_duration := COALESCE(v_contract.contract_duration, v_offer.contract_duration, v_offer.duration, 36);

  -- Construire le résultat
  v_result := json_build_object(
    'contract', json_build_object(
      'id', v_contract.id,
      'tracking_number', v_contract.tracking_number,
      'contract_number', v_contract.contract_number,
      'created_at', v_contract.created_at,
      'company_id', v_contract.company_id,
      'client_id', v_contract.client_id,
      'offer_id', v_contract.offer_id,
      'leaser_id', v_contract.leaser_id,
      'signature_status', v_contract.signature_status,
      'special_provisions', v_contract.special_provisions,

      'client_name', v_contract.client_name,
      'client_email', v_contract.client_email,

      'monthly_payment', v_contract.monthly_payment,
      'contract_duration', v_contract_duration,
      'contract_duration_raw', v_contract.contract_duration,

      'contract_start_date', v_contract.contract_start_date,
      'contract_end_date', v_contract.contract_end_date,
      'equipment_description', v_contract.equipment_description,

      'leaser_name', v_contract.leaser_name,
      'is_self_leasing', COALESCE(v_contract.is_self_leasing, v_leaser.is_own_company, false),

      'file_fee', COALESCE(v_offer.file_fee, 0),
      'annual_insurance', COALESCE(v_offer.annual_insurance, 0),
      'down_payment', COALESCE(v_offer.down_payment, 0),
      'coefficient', COALESCE(v_offer.coefficient, 0),
      'financed_amount', COALESCE(v_offer.financed_amount, 0),
      'amount', COALESCE(v_offer.amount, 0),

      'contract_signature_data', v_contract.contract_signature_data,
      'contract_signer_name', v_contract.contract_signer_name,
      'contract_signer_ip', v_contract.contract_signer_ip,
      'contract_signed_at', v_contract.contract_signed_at
    ),

    'client', json_build_object(
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

    'company', json_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'logo_url', v_company.logo_url,
      'primary_color', v_company.primary_color
    ),

    'company_customization', json_build_object(
      'company_name', v_company_customization.company_name,
      'company_email', v_company_customization.company_email,
      'company_phone', v_company_customization.company_phone,
      'company_address', v_company_customization.company_address,
      'company_city', v_company_customization.company_city,
      'company_postal_code', v_company_customization.company_postal_code,
      'company_country', v_company_customization.company_country,
      'company_vat_number', v_company_customization.company_vat_number,
      'company_bce', v_company_customization.company_bce,
      'logo_url', v_company_customization.logo_url
    ),

    'leaser', CASE WHEN v_leaser.id IS NOT NULL THEN
      json_build_object(
        'id', v_leaser.id,
        'name', v_leaser.name,
        'company_name', v_leaser.company_name,
        'is_own_company', v_leaser.is_own_company,
        'logo_url', v_leaser.logo_url
      )
    ELSE NULL END,

    'equipment', COALESCE(v_equipment, '[]'::json)
  );

  RETURN v_result;
END;
$function$;