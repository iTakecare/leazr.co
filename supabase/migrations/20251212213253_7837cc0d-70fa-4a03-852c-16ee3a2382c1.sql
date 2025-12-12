-- Fix: Cast TEXT parameter to UUID for comparison with contract_signature_token column
CREATE OR REPLACE FUNCTION public.sign_contract_public(
  p_signature_token text,
  p_signature_data text,
  p_signer_name text,
  p_signer_ip text DEFAULT NULL,
  p_client_iban text DEFAULT NULL,
  p_client_bic text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id UUID;
  v_offer_id UUID;
BEGIN
  -- Get contract ID - Cast TEXT to UUID for comparison
  SELECT id, offer_id INTO v_contract_id, v_offer_id
  FROM contracts
  WHERE contract_signature_token = p_signature_token::uuid
    AND is_self_leasing = true
    AND signature_status = 'pending_signature';
  
  IF v_contract_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contrat non trouvé ou déjà signé'
    );
  END IF;
  
  -- Update contract with signature
  UPDATE contracts
  SET 
    signature_status = 'signed',
    contract_signed_at = NOW(),
    contract_signer_name = p_signer_name,
    contract_signer_ip = p_signer_ip,
    contract_signature_data = p_signature_data,
    client_iban = p_client_iban,
    client_bic = p_client_bic,
    status = 'active',
    updated_at = NOW()
  WHERE id = v_contract_id;
  
  -- Update offer workflow status
  UPDATE offers
  SET 
    workflow_status = 'signed',
    converted_to_contract = true,
    updated_at = NOW()
  WHERE id = v_offer_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id
  );
END;
$function$;