-- Fix get_contract_statistics_by_status: remove references to non-existent contract columns
-- Keep only one unambiguous signature and preserve expected return shape for the dashboard.

DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer, uuid);
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();

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
  target_year integer := COALESCE(p_year, EXTRACT(year FROM now())::integer);
BEGIN
  user_company_id := get_user_company_id();

  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  -- REALIZED: contrats avec factures payées (filtré par année des factures)
  RETURN QUERY
  WITH paid_invoices_by_contract AS (
    SELECT
      i.contract_id,
      SUM(COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0))::numeric AS revenue
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.contract_id IS NOT NULL
      AND i.status = 'paid'
      AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year
    GROUP BY i.contract_id
  ),
  purchases_by_contract AS (
    SELECT
      ce.contract_id,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity)::numeric AS purchases
    FROM contract_equipment ce
    GROUP BY ce.contract_id
  )
  SELECT
    'realized'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(p.revenue), 0)::numeric AS total_revenue,
    COALESCE(SUM(COALESCE(pb.purchases, 0)), 0)::numeric AS total_purchases,
    (COALESCE(SUM(p.revenue), 0) - COALESCE(SUM(COALESCE(pb.purchases, 0)), 0))::numeric AS total_margin
  FROM contracts c
  INNER JOIN paid_invoices_by_contract p ON p.contract_id = c.id
  LEFT JOIN purchases_by_contract pb ON pb.contract_id = c.id
  WHERE c.company_id = user_company_id;

  -- DIRECT_SALES: offres direct_sale acceptées (filtré par année)
  RETURN QUERY
  SELECT
    'direct_sales'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(o.amount), 0)::numeric AS total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0)
       FROM offer_equipment oe
       WHERE oe.offer_id = o.id)
    ), 0)::numeric AS total_purchases,
    (COALESCE(SUM(o.amount), 0) - COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0)
       FROM offer_equipment oe
       WHERE oe.offer_id = o.id)
    ), 0))::numeric AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.type = 'direct_sale'
    AND o.status = 'accepted'
    AND EXTRACT(year FROM o.created_at) = target_year;

  -- PENDING: stock d'offres en cours (PAS de filtre année)
  RETURN QUERY
  WITH offer_equipment_agg AS (
    SELECT
      oe.offer_id,
      COALESCE(SUM(oe.purchase_price * oe.quantity), 0) as eq_purchase,
      COALESCE(SUM(oe.monthly_payment * oe.quantity), 0) as eq_monthly,
      COALESCE(SUM(oe.selling_price * oe.quantity), 0) as eq_selling
    FROM offer_equipment oe
    GROUP BY oe.offer_id
  ),
  pending_offers AS (
    SELECT
      o.id,
      o.coefficient,
      o.financed_amount,
      o.amount,
      COALESCE(oea.eq_purchase, 0) as eq_purchase,
      COALESCE(oea.eq_monthly, 0) as eq_monthly,
      COALESCE(oea.eq_selling, 0) as eq_selling,
      CASE
        WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(oea.eq_monthly, 0) > 0
          THEN (COALESCE(oea.eq_monthly, 0) * 100 / o.coefficient)
        WHEN COALESCE(oea.eq_selling, 0) > 0
          THEN COALESCE(oea.eq_selling, 0)
        ELSE COALESCE(o.financed_amount, o.amount, 0)
      END as financed_effective
    FROM offers o
    LEFT JOIN offer_equipment_agg oea ON oea.offer_id = o.id
    WHERE o.company_id = user_company_id
      AND o.converted_to_contract = false
      AND LOWER(COALESCE(o.workflow_status, '')) NOT IN (
        'accepted','validated','financed','contract_sent','signed','invoicing',
        'internal_rejected','leaser_rejected','rejected','client_rejected'
      )
  )
  SELECT
    'pending'::text AS status,
    COUNT(*)::bigint AS count,
    0::numeric AS total_revenue,
    COALESCE(SUM(eq_purchase), 0)::numeric AS total_purchases,
    COALESCE(SUM(
      CASE
        WHEN eq_purchase = 0 THEN COALESCE(financed_effective, 0)
        ELSE financed_effective - eq_purchase
      END
    ), 0)::numeric AS total_margin
  FROM pending_offers;

  -- REFUSED: offres rejetées (filtré par année)
  RETURN QUERY
  WITH offer_equipment_agg AS (
    SELECT
      oe.offer_id,
      COALESCE(SUM(oe.purchase_price * oe.quantity), 0) as eq_purchase,
      COALESCE(SUM(oe.monthly_payment * oe.quantity), 0) as eq_monthly,
      COALESCE(SUM(oe.selling_price * oe.quantity), 0) as eq_selling
    FROM offer_equipment oe
    GROUP BY oe.offer_id
  ),
  refused_offers AS (
    SELECT
      o.id,
      o.coefficient,
      o.financed_amount,
      o.amount,
      COALESCE(oea.eq_purchase, 0) as eq_purchase,
      COALESCE(oea.eq_monthly, 0) as eq_monthly,
      COALESCE(oea.eq_selling, 0) as eq_selling,
      CASE
        WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(oea.eq_monthly, 0) > 0
          THEN (COALESCE(oea.eq_monthly, 0) * 100 / o.coefficient)
        WHEN COALESCE(oea.eq_selling, 0) > 0
          THEN COALESCE(oea.eq_selling, 0)
        ELSE COALESCE(o.financed_amount, o.amount, 0)
      END as financed_effective
    FROM offers o
    LEFT JOIN offer_equipment_agg oea ON oea.offer_id = o.id
    WHERE o.company_id = user_company_id
      AND LOWER(COALESCE(o.workflow_status, '')) IN (
        'internal_rejected','leaser_rejected','rejected','client_rejected'
      )
      AND EXTRACT(year FROM o.created_at) = target_year
  )
  SELECT
    'refused'::text AS status,
    COUNT(*)::bigint AS count,
    0::numeric AS total_revenue,
    COALESCE(SUM(eq_purchase), 0)::numeric AS total_purchases,
    COALESCE(SUM(
      CASE
        WHEN eq_purchase = 0 THEN COALESCE(financed_effective, 0)
        ELSE financed_effective - eq_purchase
      END
    ), 0)::numeric AS total_margin
  FROM refused_offers;

  -- FORECAST: contrats actifs sans factures (PAS de filtre année)
  RETURN QUERY
  WITH purchases_by_contract AS (
    SELECT
      ce.contract_id,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity)::numeric AS purchases,
      SUM((COALESCE(ce.actual_purchase_price, ce.purchase_price) * (1 + COALESCE(ce.margin, 0) / 100)) * ce.quantity)::numeric AS revenue
    FROM contract_equipment ce
    GROUP BY ce.contract_id
  )
  SELECT
    'forecast'::text AS status,
    COUNT(DISTINCT c.id)::bigint AS count,
    COALESCE(SUM(COALESCE(p.revenue, 0)), 0)::numeric AS total_revenue,
    COALESCE(SUM(COALESCE(p.purchases, 0)), 0)::numeric AS total_purchases,
    (COALESCE(SUM(COALESCE(p.revenue, 0)), 0) - COALESCE(SUM(COALESCE(p.purchases, 0)), 0))::numeric AS total_margin
  FROM contracts c
  LEFT JOIN purchases_by_contract p ON p.contract_id = c.id
  WHERE c.company_id = user_company_id
    AND c.status = 'active'
    AND c.leaser_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.company_id = user_company_id
        AND i.contract_id = c.id
    );

END;
$$;