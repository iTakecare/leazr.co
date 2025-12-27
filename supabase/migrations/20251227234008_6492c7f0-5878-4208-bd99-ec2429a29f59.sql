-- Create public RPC to set signed contract PDF URL via signature token
CREATE OR REPLACE FUNCTION public.set_signed_contract_pdf_url_public(
  p_token UUID,
  p_pdf_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  -- Find contract by signature token
  SELECT id, signature_status 
  INTO v_contract 
  FROM contracts 
  WHERE signature_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not found');
  END IF;

  -- Only allow updating if contract is signed
  IF v_contract.signature_status != 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract must be signed first');
  END IF;

  -- Update the PDF URL
  UPDATE contracts 
  SET 
    signed_contract_pdf_url = p_pdf_url,
    updated_at = now()
  WHERE id = v_contract.id;

  RETURN jsonb_build_object('success', true, 'contract_id', v_contract.id);
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.set_signed_contract_pdf_url_public(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.set_signed_contract_pdf_url_public(UUID, TEXT) TO authenticated;