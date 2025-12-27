-- Drop and recreate get_contract_for_signature without is_self_leasing restriction
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_signature_token TEXT)
RETURNS TABLE (
  id UUID,
  offer_id UUID,
  client_name TEXT,
  client_company TEXT,
  client_email TEXT,
  equipment_description TEXT,
  monthly_payment NUMERIC,
  contract_duration INTEGER,
  commission NUMERIC,
  leaser_name TEXT,
  leaser_logo_url TEXT,
  company_name TEXT,
  company_logo_url TEXT,
  signature_status TEXT,
  contract_signed_at TIMESTAMPTZ,
  contract_signer_name TEXT,
  offer_equipment JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.offer_id,
    COALESCE(o.client_name, '')::TEXT as client_name,
    COALESCE(cl.company, cl.name, '')::TEXT as client_company,
    COALESCE(c.client_email, o.client_email, '')::TEXT as client_email,
    COALESCE(c.equipment_description, o.equipment_description, '')::TEXT as equipment_description,
    COALESCE(c.monthly_payment, o.monthly_payment, 0)::NUMERIC as monthly_payment,
    COALESCE(c.contract_duration, 36)::INTEGER as contract_duration,
    COALESCE(c.commission, o.commission, 0)::NUMERIC as commission,
    COALESCE(c.leaser_name, l.name, '')::TEXT as leaser_name,
    COALESCE(l.logo_url, '')::TEXT as leaser_logo_url,
    COALESCE(comp.name, '')::TEXT as company_name,
    COALESCE(comp.logo_url, '')::TEXT as company_logo_url,
    COALESCE(c.signature_status, 'pending_signature')::TEXT as signature_status,
    c.contract_signed_at,
    c.contract_signer_name,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'title', eq.title,
        'quantity', eq.quantity,
        'monthlyPayment', eq.monthly_payment,
        'purchasePrice', eq.purchase_price
      ))
      FROM offer_equipment eq WHERE eq.offer_id = o.id),
      '[]'::jsonb
    ) as offer_equipment
  FROM contracts c
  LEFT JOIN offers o ON c.offer_id = o.id
  LEFT JOIN clients cl ON o.client_id = cl.id
  LEFT JOIN leasers l ON c.leaser_id = l.id
  LEFT JOIN companies comp ON c.company_id = comp.id
  WHERE c.contract_signature_token = p_signature_token::UUID
    AND c.signature_status IN ('pending_signature', 'draft')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update sign_contract_public to remove is_self_leasing restriction
CREATE OR REPLACE FUNCTION public.sign_contract_public(
  p_signature_token TEXT,
  p_signature_data TEXT,
  p_signer_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_contract_id UUID;
  v_current_status TEXT;
BEGIN
  -- Get contract by token
  SELECT id, signature_status INTO v_contract_id, v_current_status
  FROM contracts
  WHERE contract_signature_token = p_signature_token::UUID;
  
  IF v_contract_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrat non trouvé');
  END IF;
  
  -- Check if already signed
  IF v_current_status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce contrat a déjà été signé');
  END IF;
  
  -- Update contract with signature
  UPDATE contracts
  SET 
    signature_status = 'signed',
    contract_signed_at = NOW(),
    contract_signature_data = p_signature_data,
    contract_signer_name = p_signer_name,
    updated_at = NOW()
  WHERE id = v_contract_id;
  
  RETURN jsonb_build_object('success', true, 'contract_id', v_contract_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;