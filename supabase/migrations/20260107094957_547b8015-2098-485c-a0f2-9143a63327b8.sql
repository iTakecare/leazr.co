-- Drop both versions of the function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Create single unified function with p_year parameter (default null = all years)
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE(
  status text,
  count bigint,
  total_amount numeric,
  total_monthly_payment numeric,
  avg_amount numeric,
  total_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  
  -- PENDING: demandes en attente (exclut leaser_rejected et autres statuts finaux)
  SELECT 
    'pending'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(AVG(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as avg_amount,
    COALESCE(
      SUM(COALESCE(o.financed_amount, o.amount, 0)) - 
      SUM((SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
           FROM offer_equipment oe WHERE oe.offer_id = o.id))
    , 0)::numeric as total_margin
  FROM offers o
  WHERE o.converted_to_contract = false
    AND COALESCE(o.workflow_status, 'draft') NOT IN (
      'accepted', 'validated', 'financed', 'contract_sent', 'signed', 
      'contract_signed', 'invoicing', 'internal_rejected', 'leaser_rejected',
      'rejected', 'client_rejected'
    )
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)

  UNION ALL

  -- ACCEPTED: demandes validées/acceptées (non encore converties en contrat)
  SELECT 
    'accepted'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(AVG(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as avg_amount,
    COALESCE(
      SUM(COALESCE(o.financed_amount, o.amount, 0)) - 
      SUM((SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
           FROM offer_equipment oe WHERE oe.offer_id = o.id))
    , 0)::numeric as total_margin
  FROM offers o
  WHERE o.converted_to_contract = false
    AND COALESCE(o.workflow_status, 'draft') IN (
      'accepted', 'validated', 'financed', 'contract_sent', 'signed', 'contract_signed', 'invoicing'
    )
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)

  UNION ALL

  -- SIGNED: contrats signés
  SELECT 
    'signed'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.leasing_duration, 36), 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(AVG(COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.leasing_duration, 36), 0)), 0)::numeric as avg_amount,
    COALESCE(
      SUM(COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.leasing_duration, 36), 0)) - 
      SUM((SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
           FROM contract_equipment ce WHERE ce.contract_id = c.id))
    , 0)::numeric as total_margin
  FROM contracts c
  WHERE c.status = 'active'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)

  UNION ALL

  -- REJECTED: demandes refusées
  SELECT 
    'rejected'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as total_amount,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_monthly_payment,
    COALESCE(AVG(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric as avg_amount,
    COALESCE(
      SUM(COALESCE(o.financed_amount, o.amount, 0)) - 
      SUM((SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
           FROM offer_equipment oe WHERE oe.offer_id = o.id))
    , 0)::numeric as total_margin
  FROM offers o
  WHERE o.converted_to_contract = false
    AND COALESCE(o.workflow_status, 'draft') IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year);
END;
$$;