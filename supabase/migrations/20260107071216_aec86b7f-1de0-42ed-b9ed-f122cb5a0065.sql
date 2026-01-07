-- Drop all existing overloads of get_contract_statistics_by_status
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer, uuid);

-- Recreate the function with correct logic
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE(
  status text,
  count bigint,
  total_revenue numeric,
  total_purchases numeric,
  total_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Get the user's company ID for multi-tenant filtering
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  
  -- 1. REALIZED: Active contracts (leasing, not self-leasing)
  SELECT 
    'realized'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN c.coefficient > 0 AND c.monthly_payment > 0 
        THEN c.monthly_payment * 100 / c.coefficient
        ELSE COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.contract_duration, 36), 0)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE(SUM(eq_totals.equipment_purchase), 0)::numeric AS total_purchases,
    (COALESCE(SUM(
      CASE 
        WHEN c.coefficient > 0 AND c.monthly_payment > 0 
        THEN c.monthly_payment * 100 / c.coefficient
        ELSE COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.contract_duration, 36), 0)
      END
    ), 0) - COALESCE(SUM(eq_totals.equipment_purchase), 0))::numeric AS total_margin
  FROM contracts c
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1)), 0) AS equipment_purchase
    FROM contract_equipment ce
    WHERE ce.contract_id = c.id
  ) eq_totals ON true
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'signed')
    AND COALESCE(c.is_self_leasing, false) = false
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)

  UNION ALL

  -- 2. DIRECT_SALES: Self-leasing contracts
  SELECT 
    'direct_sales'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(
      COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.contract_duration, 36), 0)
    ), 0)::numeric AS total_revenue,
    COALESCE(SUM(eq_totals.equipment_purchase), 0)::numeric AS total_purchases,
    (COALESCE(SUM(
      COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.contract_duration, 36), 0)
    ), 0) - COALESCE(SUM(eq_totals.equipment_purchase), 0))::numeric AS total_margin
  FROM contracts c
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1)), 0) AS equipment_purchase
    FROM contract_equipment ce
    WHERE ce.contract_id = c.id
  ) eq_totals ON true
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'signed')
    AND c.is_self_leasing = true
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)

  UNION ALL

  -- 3. PENDING: Offers in progress (not converted, not rejected)
  SELECT 
    'pending'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 
        THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 
        THEN o.financed_amount
        ELSE COALESCE(o.amount, 0)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE(SUM(
      COALESCE(eq_totals.equipment_purchase, o.equipment_total_purchase_price, 0)
    ), 0)::numeric AS total_purchases,
    (COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 
        THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 
        THEN o.financed_amount
        ELSE COALESCE(o.amount, 0)
      END
    ), 0) - COALESCE(SUM(
      COALESCE(eq_totals.equipment_purchase, o.equipment_total_purchase_price, 0)
    ), 0))::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)) AS equipment_purchase
    FROM offer_equipment oe
    WHERE oe.offer_id = o.id
  ) eq_totals ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.converted_to_contract, false) = false
    AND COALESCE(o.is_purchase, false) = false
    AND o.workflow_status NOT IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)

  UNION ALL

  -- 4. REFUSED: Rejected offers
  SELECT 
    'refused'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 
        THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 
        THEN o.financed_amount
        ELSE COALESCE(o.amount, 0)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE(SUM(
      COALESCE(eq_totals.equipment_purchase, o.equipment_total_purchase_price, 0)
    ), 0)::numeric AS total_purchases,
    (COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 
        THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 
        THEN o.financed_amount
        ELSE COALESCE(o.amount, 0)
      END
    ), 0) - COALESCE(SUM(
      COALESCE(eq_totals.equipment_purchase, o.equipment_total_purchase_price, 0)
    ), 0))::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)) AS equipment_purchase
    FROM offer_equipment oe
    WHERE oe.offer_id = o.id
  ) eq_totals ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year);

END;
$$;