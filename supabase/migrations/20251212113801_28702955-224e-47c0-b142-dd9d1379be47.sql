-- Phase 1: Add is_own_company to leasers table
ALTER TABLE leasers 
ADD COLUMN IF NOT EXISTS is_own_company BOOLEAN DEFAULT false;

-- Phase 2: Create contract_templates table for storing analyzed contract text with placeholders
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Contrat standard',
  raw_content TEXT NOT NULL DEFAULT '',
  parsed_content TEXT NOT NULL DEFAULT '',
  placeholders JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on contract_templates
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_templates
CREATE POLICY "contract_templates_company_isolation" ON contract_templates
FOR ALL USING (
  (company_id = get_user_company_id()) OR is_admin_optimized()
)
WITH CHECK (
  (company_id = get_user_company_id()) OR is_admin_optimized()
);

-- Phase 3: Extend contracts table for self-leasing signature
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS client_iban TEXT,
ADD COLUMN IF NOT EXISTS client_bic TEXT,
ADD COLUMN IF NOT EXISTS contract_signature_data TEXT,
ADD COLUMN IF NOT EXISTS contract_signer_name TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contract_signer_ip TEXT,
ADD COLUMN IF NOT EXISTS signed_contract_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS is_self_leasing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_signature_token UUID DEFAULT gen_random_uuid();

-- Create index for signature token lookup
CREATE INDEX IF NOT EXISTS idx_contracts_signature_token ON contracts(contract_signature_token);

-- Phase 4: Create public function for contract signature (accessible without auth)
CREATE OR REPLACE FUNCTION public.sign_contract_public(
  p_signature_token UUID,
  p_signature_data TEXT,
  p_signer_name TEXT,
  p_signer_ip TEXT,
  p_client_iban TEXT,
  p_client_bic TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id UUID;
  v_offer_id UUID;
  v_result JSON;
BEGIN
  -- Find contract by signature token
  SELECT id, offer_id INTO v_contract_id, v_offer_id
  FROM contracts
  WHERE contract_signature_token = p_signature_token
    AND signature_status = 'pending_signature'
    AND is_self_leasing = true;
  
  IF v_contract_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Contrat non trouvé ou déjà signé');
  END IF;
  
  -- Update contract with signature data
  UPDATE contracts
  SET 
    signature_status = 'signed',
    status = 'active',
    contract_signature_data = p_signature_data,
    contract_signer_name = p_signer_name,
    contract_signer_ip = p_signer_ip,
    contract_signed_at = now(),
    client_iban = p_client_iban,
    client_bic = p_client_bic,
    updated_at = now()
  WHERE id = v_contract_id;
  
  -- Update offer workflow status to accepted
  IF v_offer_id IS NOT NULL THEN
    UPDATE offers
    SET 
      workflow_status = 'accepted',
      updated_at = now()
    WHERE id = v_offer_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'contract_id', v_contract_id,
    'message', 'Contrat signé avec succès'
  );
END;
$$;

-- Phase 5: Create function to get contract for public signature page
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_signature_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', c.id,
    'offer_id', c.offer_id,
    'client_name', c.client_name,
    'client_company', cl.company,
    'client_email', c.client_email,
    'client_address', cl.address,
    'client_city', cl.city,
    'client_postal_code', cl.postal_code,
    'client_vat_number', cl.vat_number,
    'leaser_name', c.leaser_name,
    'monthly_payment', c.monthly_payment,
    'contract_duration', c.contract_duration,
    'tracking_number', c.tracking_number,
    'signature_status', c.signature_status,
    'is_self_leasing', c.is_self_leasing,
    'company', json_build_object(
      'name', comp.name,
      'logo_url', comp.logo_url,
      'primary_color', comp.primary_color
    ),
    'equipment', (
      SELECT json_agg(json_build_object(
        'id', ce.id,
        'title', ce.title,
        'quantity', ce.quantity,
        'purchase_price', ce.purchase_price,
        'monthly_payment', ce.monthly_payment
      ))
      FROM contract_equipment ce
      WHERE ce.contract_id = c.id
    )
  ) INTO v_result
  FROM contracts c
  LEFT JOIN clients cl ON c.client_id = cl.id
  LEFT JOIN companies comp ON c.company_id = comp.id
  WHERE c.contract_signature_token = p_signature_token
    AND c.is_self_leasing = true;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission on public functions
GRANT EXECUTE ON FUNCTION public.sign_contract_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature TO anon, authenticated;