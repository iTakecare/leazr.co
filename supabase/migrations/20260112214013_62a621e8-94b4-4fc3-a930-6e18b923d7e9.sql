-- Fix get_monthly_financial_data: contracts table uses contract_end_date (not end_date)
DROP FUNCTION IF EXISTS public.get_monthly_financial_data(integer);

CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(p_year integer DEFAULT NULL)
RETURNS TABLE(
  month integer,
  year integer,
  revenue numeric,
  revenue_net numeric,
  purchases numeric,
  margin numeric,
  margin_percentage numeric,
  new_contracts integer,
  active_contracts integer,
  credit_notes_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
  target_year integer;
BEGIN
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = auth.uid();

  target_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) as m
  ),
  invoice_revenue AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      EXTRACT(YEAR FROM i.invoice_date)::integer as year,
      SUM(i.amount) as total_revenue
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND COALESCE(i.invoice_type, 'standard') <> 'credit_note'
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1, 2
  ),
  credit_notes_data AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(cn.issued_at, cn.created_at))::integer as month,
      EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at))::integer as year,
      SUM(cn.amount) as total_credit_notes
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at)) = target_year
    GROUP BY 1, 2
  ),
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM ce.actual_purchase_date)::integer as month,
      EXTRACT(YEAR FROM ce.actual_purchase_date)::integer as year,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    WHERE c.company_id = user_company_id
      AND ce.actual_purchase_date IS NOT NULL
      AND COALESCE(c.is_self_leasing, false) = false
      AND EXTRACT(YEAR FROM ce.actual_purchase_date) = target_year
    GROUP BY 1, 2
  ),
  self_leasing_monthly AS (
    SELECT
      EXTRACT(MONTH FROM c.created_at)::integer as month,
      EXTRACT(YEAR FROM c.created_at)::integer as year,
      SUM(
        (SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)), 0)
         FROM contract_equipment ce WHERE ce.contract_id = c.id)
      ) as monthly_purchase
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND c.is_self_leasing = true
      AND COALESCE(c.status, '') <> 'cancelled'
      AND EXTRACT(YEAR FROM c.created_at) = target_year
    GROUP BY 1, 2
  ),
  new_contracts_count AS (
    SELECT
      EXTRACT(MONTH FROM c.created_at)::integer as month,
      EXTRACT(YEAR FROM c.created_at)::integer as year,
      COUNT(*) as count
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND COALESCE(c.status, '') <> 'cancelled'
      AND EXTRACT(YEAR FROM c.created_at) = target_year
    GROUP BY 1, 2
  ),
  active_contracts_count AS (
    SELECT
      m.m as month,
      target_year as year,
      COUNT(c.id) as count
    FROM months m
    LEFT JOIN contracts c ON c.company_id = user_company_id
      AND COALESCE(c.status, '') NOT IN ('cancelled', 'ended')
      AND COALESCE(c.contract_start_date, c.created_at::date) <= (make_date(target_year, m.m, 1) + interval '1 month' - interval '1 day')::date
      AND (c.contract_end_date IS NULL OR c.contract_end_date >= make_date(target_year, m.m, 1))
    GROUP BY m.m
  )
  SELECT
    m.m::integer as month,
    target_year as year,
    COALESCE(ir.total_revenue, 0)::numeric as revenue,
    (COALESCE(ir.total_revenue, 0) - COALESCE(cnd.total_credit_notes, 0))::numeric as revenue_net,
    (COALESCE(ep.total_purchases, 0) + COALESCE(sl.monthly_purchase, 0))::numeric as purchases,
    (COALESCE(ir.total_revenue, 0) - COALESCE(cnd.total_credit_notes, 0) - COALESCE(ep.total_purchases, 0) - COALESCE(sl.monthly_purchase, 0))::numeric as margin,
    CASE 
      WHEN COALESCE(ir.total_revenue, 0) > 0 
      THEN (((COALESCE(ir.total_revenue, 0) - COALESCE(cnd.total_credit_notes, 0) - COALESCE(ep.total_purchases, 0) - COALESCE(sl.monthly_purchase, 0)) / COALESCE(ir.total_revenue, 1)) * 100)::numeric
      ELSE 0::numeric
    END as margin_percentage,
    COALESCE(nc.count, 0)::integer as new_contracts,
    COALESCE(ac.count, 0)::integer as active_contracts,
    COALESCE(cnd.total_credit_notes, 0)::numeric as credit_notes_amount
  FROM months m
  LEFT JOIN invoice_revenue ir ON ir.month = m.m AND ir.year = target_year
  LEFT JOIN credit_notes_data cnd ON cnd.month = m.m AND cnd.year = target_year
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.m AND ep.year = target_year
  LEFT JOIN self_leasing_monthly sl ON sl.month = m.m AND sl.year = target_year
  LEFT JOIN new_contracts_count nc ON nc.month = m.m AND nc.year = target_year
  LEFT JOIN active_contracts_count ac ON ac.month = m.m AND ac.year = target_year
  ORDER BY m.m;
END;
$$;