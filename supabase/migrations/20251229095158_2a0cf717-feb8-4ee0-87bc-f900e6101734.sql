-- Supprimer l'ancienne fonction et la recréer avec adjusted_monthly_payment
DROP FUNCTION IF EXISTS public.get_contract_for_signature(uuid);

CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_offer public.offers%ROWTYPE;
  v_client public.clients%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_customization public.company_customizations%ROWTYPE;
  v_leaser public.leasers%ROWTYPE;
  v_equipment jsonb;
  v_adjusted_monthly_payment numeric;
BEGIN
  -- Contract by signature token
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_signature_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Related offer (optional)
  IF v_contract.offer_id IS NOT NULL THEN
    SELECT * INTO v_offer
    FROM public.offers
    WHERE id = v_contract.offer_id
    LIMIT 1;
  END IF;

  -- Related client (optional)
  IF v_contract.client_id IS NOT NULL THEN
    SELECT * INTO v_client
    FROM public.clients
    WHERE id = v_contract.client_id
    LIMIT 1;
  END IF;

  -- Company (required)
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = v_contract.company_id
  LIMIT 1;

  -- Company customizations (optional)
  SELECT * INTO v_customization
  FROM public.company_customizations
  WHERE company_id = v_contract.company_id
  LIMIT 1;

  -- Leaser (optional)
  IF v_contract.leaser_id IS NOT NULL THEN
    SELECT * INTO v_leaser
    FROM public.leasers
    WHERE id = v_contract.leaser_id
    LIMIT 1;
  END IF;

  -- Equipment as JSONB array
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', ce.id,
        'title', ce.title,
        'purchase_price', ce.purchase_price,
        'quantity', ce.quantity,
        'monthly_payment', ce.monthly_payment,
        'serial_number', ce.serial_number,
        'margin', ce.margin,
        'attributes', (
          SELECT COALESCE(
            jsonb_agg(jsonb_build_object('key', cea.key, 'value', cea.value)),
            '[]'::jsonb
          )
          FROM public.contract_equipment_attributes cea
          WHERE cea.equipment_id = ce.id
        )
      )
    ),
    '[]'::jsonb
  ) INTO v_equipment
  FROM public.contract_equipment ce
  WHERE ce.contract_id = v_contract.id;

  -- Calculer la mensualité ajustée si acompte présent et self-leasing
  IF COALESCE(v_offer.down_payment, 0) > 0 
     AND COALESCE(v_offer.coefficient, 0) > 0 
     AND v_contract.is_self_leasing = true THEN
    v_adjusted_monthly_payment := ROUND(
      ((COALESCE(v_offer.financed_amount, 0) - COALESCE(v_offer.down_payment, 0)) * COALESCE(v_offer.coefficient, 0)) / 100, 
      2
    );
  ELSE
    v_adjusted_monthly_payment := COALESCE(v_offer.monthly_payment, v_contract.monthly_payment, 0);
  END IF;

  RETURN jsonb_build_object(
    -- Contract (top-level)
    'id', v_contract.id,
    'offer_id', v_contract.offer_id,
    'client_id', v_contract.client_id,
    'client_name', COALESCE(v_client.name, v_contract.client_name),
    'client_email', COALESCE(v_client.email, v_contract.client_email),
    'tracking_number', v_contract.tracking_number,
    'contract_number', v_contract.contract_number,
    'signature_status', v_contract.signature_status,
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_signer_name', v_contract.contract_signer_name,
    'contract_signer_ip', v_contract.contract_signer_ip,
    'contract_signature_data', v_contract.contract_signature_data,
    'signed_contract_pdf_url', v_contract.signed_contract_pdf_url,
    'contract_start_date', v_contract.contract_start_date,
    'contract_end_date', v_contract.contract_end_date,
    'contract_duration', v_contract.contract_duration,
    'monthly_payment', COALESCE(v_offer.monthly_payment, v_contract.monthly_payment, 0),
    'adjusted_monthly_payment', v_adjusted_monthly_payment,
    'coefficient', COALESCE(v_offer.coefficient, 0),
    'commission', COALESCE(v_offer.commission, 0),
    'down_payment', COALESCE(v_offer.down_payment, 0),
    'financed_amount', COALESCE(v_offer.financed_amount, 0),
    'file_fee', COALESCE(v_offer.file_fee, 0),
    'annual_insurance', COALESCE(v_offer.annual_insurance, 0),
    'client_iban', v_contract.client_iban,
    'client_bic', v_contract.client_bic,
    'is_self_leasing', COALESCE(v_contract.is_self_leasing, false),
    'leaser_id', v_contract.leaser_id,
    'leaser_name', COALESCE(v_leaser.name, v_contract.leaser_name),
    'special_provisions', v_contract.special_provisions,

    -- Nested objects (expected by public pages)
    'client', CASE WHEN v_client.id IS NOT NULL THEN jsonb_build_object(
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
      'billing_address', v_client.billing_address,
      'billing_city', v_client.billing_city,
      'billing_postal_code', v_client.billing_postal_code,
      'billing_country', v_client.billing_country
    ) ELSE NULL END,

    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'logo_url', v_company.logo_url,
      'primary_color', v_company.primary_color,
      'secondary_color', v_company.secondary_color,
      'accent_color', v_company.accent_color,
      'signature_url', v_company.signature_url,
      'signature_representative_name', v_company.signature_representative_name,
      'signature_representative_title', v_company.signature_representative_title
    ),

    'company_customization', CASE WHEN v_customization.company_id IS NOT NULL THEN jsonb_build_object(
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

    'leaser', CASE WHEN v_leaser.id IS NOT NULL THEN jsonb_build_object(
      'id', v_leaser.id,
      'name', v_leaser.name,
      'logo_url', v_leaser.logo_url,
      'company_name', v_leaser.company_name,
      'email', v_leaser.email,
      'phone', v_leaser.phone,
      'vat_number', v_leaser.vat_number,
      'address', v_leaser.address,
      'city', v_leaser.city,
      'postal_code', v_leaser.postal_code,
      'country', v_leaser.country,
      'is_own_company', v_leaser.is_own_company
    ) ELSE NULL END,

    'equipment', v_equipment
  );
END;
$function$;