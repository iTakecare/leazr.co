-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_contract_for_signature(uuid);

-- Recréer la fonction avec les bonnes colonnes
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- Déterminer la durée du contrat (priorité: contract, puis offer, puis default 36)
  v_contract_duration := COALESCE(v_contract.contract_duration, v_offer.contract_duration, v_offer.duration, 36);
  
  -- Construire le résultat
  v_result := json_build_object(
    'contract', json_build_object(
      'id', v_contract.id,
      'tracking_number', v_contract.tracking_number,
      'client_name', v_contract.client_name,
      'client_email', v_contract.client_email,
      'monthly_payment', v_contract.monthly_payment,
      'contract_duration', v_contract_duration,
      'contract_start_date', v_contract.contract_start_date,
      'contract_end_date', v_contract.contract_end_date,
      'equipment_description', v_contract.equipment_description,
      'leaser_name', v_contract.leaser_name,
      'file_fee', COALESCE(v_offer.file_fee, 0),
      'annual_insurance', COALESCE(v_offer.annual_insurance, 0),
      'down_payment', COALESCE(v_offer.down_payment, 0),
      'contract_signature_data', v_contract.contract_signature_data,
      'contract_signer_name', v_contract.contract_signer_name,
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
      'logo_url', v_company.logo_url
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
        'logo_url', v_leaser.logo_url
      )
    ELSE NULL END,
    'equipment', COALESCE(v_equipment, '[]'::json)
  );
  
  RETURN v_result;
END;
$$;