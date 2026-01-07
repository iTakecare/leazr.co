-- Drop and recreate get_contract_statistics_by_status with correct column names
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

CREATE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE(
  status text,
  count bigint,
  total_amount numeric,
  total_monthly_payment numeric,
  total_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- PENDING offers (excluding leaser_rejected)
  SELECT 
    'pending'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric - 
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_margin
  FROM offers o
  WHERE o.converted_to_contract = false
    AND o.workflow_status NOT IN (
      'accepted', 'validated', 'financed', 'contract_sent', 'signed', 'contract_signed', 'invoicing',
      'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
    )
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- ACCEPTED offers
  SELECT 
    'accepted'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric - 
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_margin
  FROM offers o
  WHERE o.converted_to_contract = false
    AND o.workflow_status IN ('accepted', 'validated', 'financed', 'contract_sent')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- SIGNED contracts (using correct column names: monthly_payment and contract_duration)
  SELECT 
    'signed'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0)::numeric - 
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.status IN ('signed', 'contract_signed', 'active')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)
  
  UNION ALL
  
  -- REJECTED offers
  SELECT 
    'rejected'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric - 
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_margin
  FROM offers o
  WHERE o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year);
END;
$$;