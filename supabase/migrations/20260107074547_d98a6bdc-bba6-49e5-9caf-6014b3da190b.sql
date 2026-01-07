-- Drop all existing overloads
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Create single version with correct schema references
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
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  
  -- REALIZED CONTRACTS (leasing via partner)
  SELECT 
    'realized'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 THEN o.financed_amount
        WHEN o.amount > 0 THEN o.amount
        ELSE COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE((
      SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1))
      FROM contracts c2
      LEFT JOIN contract_equipment ce ON ce.contract_id = c2.id
      LEFT JOIN offers o2 ON o2.id = c2.offer_id
      WHERE c2.company_id = user_company_id
        AND c2.status IN ('active', 'signed')
        AND COALESCE(c2.is_self_leasing, false) = false
        AND (p_year IS NULL OR EXTRACT(YEAR FROM COALESCE(c2.contract_start_date::timestamptz, c2.contract_signed_at, c2.created_at)) = p_year)
    ), 0)::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM contracts c
  LEFT JOIN offers o ON o.id = c.offer_id
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'signed')
    AND COALESCE(c.is_self_leasing, false) = false
    AND (p_year IS NULL OR EXTRACT(YEAR FROM COALESCE(c.contract_start_date::timestamptz, c.contract_signed_at, c.created_at)) = p_year)

  UNION ALL

  -- DIRECT SALES (self-leasing)
  SELECT 
    'direct_sales'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 THEN o.financed_amount
        WHEN o.amount > 0 THEN o.amount
        ELSE COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE((
      SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1))
      FROM contracts c2
      LEFT JOIN contract_equipment ce ON ce.contract_id = c2.id
      WHERE c2.company_id = user_company_id
        AND c2.status IN ('active', 'signed')
        AND c2.is_self_leasing = true
        AND (p_year IS NULL OR EXTRACT(YEAR FROM COALESCE(c2.contract_start_date::timestamptz, c2.contract_signed_at, c2.created_at)) = p_year)
    ), 0)::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM contracts c
  LEFT JOIN offers o ON o.id = c.offer_id
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'signed')
    AND c.is_self_leasing = true
    AND (p_year IS NULL OR EXTRACT(YEAR FROM COALESCE(c.contract_start_date::timestamptz, c.contract_signed_at, c.created_at)) = p_year)

  UNION ALL

  -- PENDING OFFERS
  SELECT 
    'pending'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 THEN o.financed_amount
        ELSE COALESCE(o.amount, 0)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE((
      SELECT SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1))
      FROM offers o2
      LEFT JOIN offer_equipment oe ON oe.offer_id = o2.id
      WHERE o2.company_id = user_company_id
        AND COALESCE(o2.is_purchase, false) = false
        AND COALESCE(o2.converted_to_contract, false) = false
        AND COALESCE(o2.workflow_status, 'draft') NOT IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
        AND (p_year IS NULL OR EXTRACT(YEAR FROM o2.created_at) = p_year)
    ), 0)::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND COALESCE(o.converted_to_contract, false) = false
    AND COALESCE(o.workflow_status, 'draft') NOT IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)

  UNION ALL

  -- REFUSED OFFERS
  SELECT 
    'refused'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN o.monthly_payment * 100 / o.coefficient
        WHEN o.financed_amount > 0 THEN o.financed_amount
        ELSE COALESCE(o.amount, 0)
      END
    ), 0)::numeric AS total_revenue,
    COALESCE((
      SELECT SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1))
      FROM offers o2
      LEFT JOIN offer_equipment oe ON oe.offer_id = o2.id
      WHERE o2.company_id = user_company_id
        AND COALESCE(o2.is_purchase, false) = false
        AND o2.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
        AND (p_year IS NULL OR EXTRACT(YEAR FROM o2.created_at) = p_year)
    ), 0)::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year);

END;
$$;