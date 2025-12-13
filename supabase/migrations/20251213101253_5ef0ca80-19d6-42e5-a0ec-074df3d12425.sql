-- Fix: Update contract status to 'signed' instead of 'active' when signing

DROP FUNCTION IF EXISTS public.sign_contract_public(text,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.sign_contract_public(
  p_signature_token TEXT,
  p_signer_name TEXT,
  p_signature_data TEXT,
  p_signer_ip TEXT,
  p_client_iban TEXT DEFAULT NULL,
  p_client_bic TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id UUID;
  v_offer_id UUID;
  v_result JSON;
BEGIN
  -- Find the contract with self-leasing detection via leaser
  SELECT c.id, c.offer_id INTO v_contract_id, v_offer_id
  FROM contracts c
  LEFT JOIN leasers l ON c.leaser_name = l.name AND l.company_id = c.company_id
  WHERE c.contract_signature_token = p_signature_token::uuid
    AND (c.is_self_leasing = true OR l.is_own_company = true)
    AND (c.signature_status IS NULL OR c.signature_status IN ('draft', 'pending_signature'));

  IF v_contract_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Contrat non trouvé ou déjà signé');
  END IF;

  -- Update contract with signature data - status = 'signed' (not 'active')
  UPDATE contracts
  SET 
    signature_status = 'signed',
    contract_signer_name = p_signer_name,
    contract_signature_data = p_signature_data,
    contract_signer_ip = p_signer_ip,
    contract_signed_at = NOW(),
    client_iban = COALESCE(p_client_iban, client_iban),
    client_bic = COALESCE(p_client_bic, client_bic),
    status = 'signed',
    updated_at = NOW()
  WHERE id = v_contract_id;

  -- Update offer workflow status if linked
  IF v_offer_id IS NOT NULL THEN
    UPDATE offers
    SET 
      workflow_status = 'contract_signed',
      updated_at = NOW()
    WHERE id = v_offer_id;
  END IF;

  SELECT json_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'message', 'Contrat signé avec succès'
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sign_contract_public(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;