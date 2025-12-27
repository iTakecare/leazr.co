-- =====================================================
-- MIGRATION: Fix get_contract_for_signature + Add contract numbering system
-- =====================================================

-- 1) Add contract_prefix column to companies (for numbering like LOC-ITC-...)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contract_prefix TEXT;

-- Set default prefix for iTakecare
UPDATE public.companies SET contract_prefix = 'ITC' WHERE slug = 'itakecare' AND contract_prefix IS NULL;

-- 2) Create sequence table for self-leasing contract numbers
CREATE TABLE IF NOT EXISTS public.self_leasing_contract_sequence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year, month)
);

-- Enable RLS
ALTER TABLE public.self_leasing_contract_sequence ENABLE ROW LEVEL SECURITY;

-- RLS policy - only company members can view their sequence (read-only, function handles writes)
CREATE POLICY "Company members can view their contract sequence"
  ON public.self_leasing_contract_sequence
  FOR SELECT
  USING (company_id = get_user_company_id());

-- 3) Create the generate_self_leasing_contract_number function
CREATE OR REPLACE FUNCTION public.generate_self_leasing_contract_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_prefix TEXT;
  v_year INTEGER;
  v_month INTEGER;
  v_next_number INTEGER;
  v_contract_number TEXT;
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM now());
  v_month := EXTRACT(MONTH FROM now());
  
  -- Get company prefix (fallback to first 3 chars of slug uppercased)
  SELECT COALESCE(contract_prefix, UPPER(LEFT(slug, 3)), 'LOC')
  INTO v_prefix
  FROM public.companies
  WHERE id = p_company_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'LOC';
  END IF;
  
  -- Atomically increment or insert the sequence
  INSERT INTO public.self_leasing_contract_sequence (company_id, year, month, last_number)
  VALUES (p_company_id, v_year, v_month, 1)
  ON CONFLICT (company_id, year, month)
  DO UPDATE SET 
    last_number = self_leasing_contract_sequence.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;
  
  -- Format: LOC-{PREFIX}-{YYYY}-{MM}{XXX}
  -- Example: LOC-ITC-2025-12001
  v_contract_number := 'LOC-' || v_prefix || '-' || v_year::TEXT || '-' || 
                       LPAD(v_month::TEXT, 2, '0') || LPAD(v_next_number::TEXT, 3, '0');
  
  RETURN v_contract_number;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_self_leasing_contract_number(UUID) TO authenticated;

-- 4) Fix the get_contract_for_signature function (replace lease_duration with contract_duration)
DROP FUNCTION IF EXISTS public.get_contract_for_signature(UUID);

CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_client RECORD;
  v_company RECORD;
  v_equipment JSONB;
  v_result JSONB;
BEGIN
  -- Find contract by signature token
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_signature_token = p_token;
  
  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;
  
  -- Get client info
  SELECT * INTO v_client
  FROM public.clients
  WHERE id = v_contract.client_id;
  
  -- Get company info
  SELECT c.*, cc.company_name as customization_name, cc.company_address, cc.company_city, 
         cc.company_postal_code, cc.company_email, cc.company_phone, cc.logo_url as custom_logo
  INTO v_company
  FROM public.companies c
  LEFT JOIN public.company_customizations cc ON cc.company_id = c.id
  WHERE c.id = v_contract.company_id;
  
  -- Get equipment
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'title', ce.title,
      'quantity', ce.quantity,
      'monthly_payment', ce.monthly_payment,
      'purchase_price', ce.purchase_price,
      'margin', ce.margin,
      'serial_number', ce.serial_number
    )
  ), '[]'::jsonb) INTO v_equipment
  FROM public.contract_equipment ce
  WHERE ce.contract_id = v_contract.id;
  
  -- Build result
  v_result := jsonb_build_object(
    'id', v_contract.id,
    'contract_number', v_contract.contract_number,
    'tracking_number', v_contract.tracking_number,
    'signature_status', v_contract.signature_status,
    'contract_signed_at', v_contract.contract_signed_at,
    'contract_signer_name', v_contract.contract_signer_name,
    'monthly_payment', v_contract.monthly_payment,
    'contract_duration', COALESCE(v_contract.contract_duration, 36),
    'leaser_name', v_contract.leaser_name,
    'is_self_leasing', v_contract.is_self_leasing,
    'created_at', v_contract.created_at,
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'company', v_client.company,
      'email', v_client.email,
      'phone', v_client.phone,
      'address', v_client.address,
      'city', v_client.city,
      'postal_code', v_client.postal_code,
      'vat_number', v_client.vat_number
    ),
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', COALESCE(v_company.customization_name, v_company.name),
      'logo_url', COALESCE(v_company.custom_logo, v_company.logo_url),
      'address', v_company.company_address,
      'city', v_company.company_city,
      'postal_code', v_company.company_postal_code,
      'email', v_company.company_email,
      'phone', v_company.company_phone,
      'slug', v_company.slug
    ),
    'equipment', v_equipment
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(UUID) TO authenticated;

-- 5) Backfill: Set is_self_leasing=true for contracts with own-company leasers
UPDATE public.contracts c
SET is_self_leasing = true
FROM public.leasers l
WHERE c.leaser_id = l.id 
  AND l.is_own_company = true 
  AND (c.is_self_leasing IS NULL OR c.is_self_leasing = false);

-- 6) Backfill contract numbers for self-leasing contracts that don't have one
-- This uses a DO block to call the function for each contract
DO $$
DECLARE
  r RECORD;
  v_contract_number TEXT;
BEGIN
  FOR r IN 
    SELECT c.id, c.company_id
    FROM public.contracts c
    WHERE c.is_self_leasing = true 
      AND (c.contract_number IS NULL OR c.contract_number = '')
    ORDER BY c.created_at ASC
  LOOP
    -- Generate a contract number
    v_contract_number := public.generate_self_leasing_contract_number(r.company_id);
    
    -- Update the contract
    UPDATE public.contracts
    SET contract_number = v_contract_number,
        tracking_number = COALESCE(tracking_number, v_contract_number)
    WHERE id = r.id;
  END LOOP;
END $$;