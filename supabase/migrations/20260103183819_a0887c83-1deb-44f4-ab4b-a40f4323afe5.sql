-- Drop and recreate the function with corrected total_revenue for pending and refused
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer)
RETURNS TABLE(status text, count bigint, total_revenue numeric, total_purchases numeric, total_margin numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Get the company_id for the current user
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Realized contracts (signed contracts for the year)
  RETURN QUERY
  SELECT 
    'realized'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(c.monthly_payment * 12 * COALESCE(c.leasing_duration_months, 36) / 12), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(c.monthly_payment * 12 * COALESCE(c.leasing_duration_months, 36) / 12) - 
             SUM((SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
                  FROM contract_equipment ce WHERE ce.contract_id = c.id)), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.status = 'signed'
    AND EXTRACT(YEAR FROM c.created_at) = p_year;

  -- Direct sales (contracts with type 'direct_sale' for the year)
  RETURN QUERY
  SELECT 
    'direct_sales'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    0::numeric as total_margin
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.type = 'direct_sale'
    AND EXTRACT(YEAR FROM c.created_at) = p_year;

  -- Forecast (offers converted to contract but not yet signed, for the year)
  RETURN QUERY
  SELECT 
    'forecast'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(c.monthly_payment * 12 * COALESCE(c.leasing_duration_months, 36) / 12), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(c.monthly_payment * 12 * COALESCE(c.leasing_duration_months, 36) / 12) - 
             SUM((SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
                  FROM contract_equipment ce WHERE ce.contract_id = c.id)), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.status != 'signed'
    AND EXTRACT(YEAR FROM c.created_at) = p_year;

  -- Pending offers (in-progress, NOT converted, NO year filter = current stock)
  -- Matches the "Demandes > En cours" logic: workflow_status NOT IN rejected/accepted/validated/etc.
  RETURN QUERY
  WITH offer_totals AS (
    SELECT 
      o.id as offer_id,
      COALESCE(SUM(oe.quantity * oe.purchase_price), 0) as eq_purchase,
      COALESCE(SUM(oe.quantity * oe.monthly_payment), 0) as eq_monthly,
      COALESCE(SUM(
        CASE 
          WHEN oe.selling_price IS NOT NULL AND oe.selling_price > 0 
          THEN oe.quantity * oe.selling_price
          ELSE 0
        END
      ), 0) as eq_selling
    FROM offers o
    LEFT JOIN offer_equipment oe ON oe.offer_id = o.id
    WHERE o.company_id = v_company_id
      AND o.converted_to_contract = false
      AND LOWER(COALESCE(o.workflow_status, '')) NOT IN (
        'accepted', 'validated', 'financed', 'contract_sent', 'signed', 'invoicing',
        'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
      )
    GROUP BY o.id
  ),
  offer_with_margin AS (
    SELECT 
      o.id,
      ot.eq_purchase,
      CASE 
        WHEN o.coefficient IS NOT NULL AND o.coefficient > 0 AND ot.eq_monthly > 0 
          THEN (ot.eq_monthly * 100 / o.coefficient)
        WHEN ot.eq_selling > 0 
          THEN ot.eq_selling
        ELSE COALESCE(o.financed_amount, o.amount, 0)
      END as financed_effective
    FROM offers o
    JOIN offer_totals ot ON ot.offer_id = o.id
  )
  SELECT 
    'pending'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(owm.financed_effective), 0)::numeric as total_revenue,
    COALESCE(SUM(owm.eq_purchase), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE 
        WHEN owm.eq_purchase = 0 THEN owm.financed_effective
        ELSE owm.financed_effective - owm.eq_purchase
      END
    ), 0)::numeric as total_margin
  FROM offer_with_margin owm;

  -- Refused offers (rejected workflow_status, WITH year filter)
  RETURN QUERY
  WITH offer_totals AS (
    SELECT 
      o.id as offer_id,
      COALESCE(SUM(oe.quantity * oe.purchase_price), 0) as eq_purchase,
      COALESCE(SUM(oe.quantity * oe.monthly_payment), 0) as eq_monthly,
      COALESCE(SUM(
        CASE 
          WHEN oe.selling_price IS NOT NULL AND oe.selling_price > 0 
          THEN oe.quantity * oe.selling_price
          ELSE 0
        END
      ), 0) as eq_selling
    FROM offers o
    LEFT JOIN offer_equipment oe ON oe.offer_id = o.id
    WHERE o.company_id = v_company_id
      AND LOWER(COALESCE(o.workflow_status, '')) IN (
        'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
      )
      AND EXTRACT(YEAR FROM o.created_at) = p_year
    GROUP BY o.id
  ),
  offer_with_margin AS (
    SELECT 
      o.id,
      ot.eq_purchase,
      CASE 
        WHEN o.coefficient IS NOT NULL AND o.coefficient > 0 AND ot.eq_monthly > 0 
          THEN (ot.eq_monthly * 100 / o.coefficient)
        WHEN ot.eq_selling > 0 
          THEN ot.eq_selling
        ELSE COALESCE(o.financed_amount, o.amount, 0)
      END as financed_effective
    FROM offers o
    JOIN offer_totals ot ON ot.offer_id = o.id
    WHERE EXTRACT(YEAR FROM o.created_at) = p_year
  )
  SELECT 
    'refused'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(owm.financed_effective), 0)::numeric as total_revenue,
    COALESCE(SUM(owm.eq_purchase), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE 
        WHEN owm.eq_purchase = 0 THEN owm.financed_effective
        ELSE owm.financed_effective - owm.eq_purchase
      END
    ), 0)::numeric as total_margin
  FROM offer_with_margin owm;

END;
$$;