-- Fix dashboard statistics: use invoice_type for realized vs direct_sales
-- and remove year filter for pending (always show current pipeline)

DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

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
  target_year integer := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);
BEGIN
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  
  -- 1) REALIZED : Factures leasing de l'année
  SELECT 
    'realized'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(inv.amount - COALESCE(inv.credited_amount, 0)), 0)::numeric AS total_revenue,
    (SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1)), 0)
     FROM contracts c2
     JOIN invoices inv2 ON inv2.contract_id = c2.id
     LEFT JOIN contract_equipment ce ON ce.contract_id = c2.id
     WHERE inv2.company_id = user_company_id
       AND inv2.invoice_type = 'leasing'
       AND EXTRACT(YEAR FROM COALESCE(inv2.invoice_date, inv2.created_at)) = target_year
     GROUP BY c2.id
     LIMIT 1
    )::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM invoices inv
  JOIN contracts c ON c.id = inv.contract_id
  WHERE inv.company_id = user_company_id
    AND inv.invoice_type = 'leasing'
    AND EXTRACT(YEAR FROM COALESCE(inv.invoice_date, inv.created_at)) = target_year

  UNION ALL

  -- 2) DIRECT_SALES : Factures purchase de l'année
  SELECT 
    'direct_sales'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(inv.amount - COALESCE(inv.credited_amount, 0)), 0)::numeric AS total_revenue,
    (SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1)), 0)
     FROM contracts c2
     JOIN invoices inv2 ON inv2.contract_id = c2.id
     LEFT JOIN contract_equipment ce ON ce.contract_id = c2.id
     WHERE inv2.company_id = user_company_id
       AND inv2.invoice_type = 'purchase'
       AND EXTRACT(YEAR FROM COALESCE(inv2.invoice_date, inv2.created_at)) = target_year
     GROUP BY c2.id
     LIMIT 1
    )::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM invoices inv
  JOIN contracts c ON c.id = inv.contract_id
  WHERE inv.company_id = user_company_id
    AND inv.invoice_type = 'purchase'
    AND EXTRACT(YEAR FROM COALESCE(inv.invoice_date, inv.created_at)) = target_year

  UNION ALL

  -- 3) PENDING : Pipeline actuel (SANS filtre année)
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
    COALESCE(SUM(eq_total.total_purchase), 0)::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)), 0) as total_purchase
    FROM offer_equipment oe WHERE oe.offer_id = o.id
  ) eq_total ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND COALESCE(o.converted_to_contract, false) = false
    AND COALESCE(o.workflow_status, 'draft') NOT IN (
      'accepted', 'validated', 'financed', 'contract_sent', 'signed',
      'invoicing',
      'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
    )

  UNION ALL

  -- 4) REFUSED : Offres rejetées dans l'année
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
    COALESCE(SUM(eq_total.total_purchase), 0)::numeric AS total_purchases,
    0::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)), 0) as total_purchase
    FROM offer_equipment oe WHERE oe.offer_id = o.id
  ) eq_total ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND EXTRACT(YEAR FROM o.created_at) = target_year;

END;
$$;