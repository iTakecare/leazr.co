-- Fix contracts that have leaser_name matching an own-company leaser but no leaser_id
UPDATE public.contracts c
SET 
  is_self_leasing = true,
  leaser_id = l.id
FROM public.leasers l
WHERE c.leaser_id IS NULL 
  AND c.leaser_name = l.name
  AND l.is_own_company = true 
  AND (c.is_self_leasing IS NULL OR c.is_self_leasing = false);

-- Now generate contract numbers for the newly identified self-leasing contracts
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