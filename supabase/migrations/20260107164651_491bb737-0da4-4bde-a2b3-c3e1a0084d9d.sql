-- Drop existing function first (signature changed)
DROP FUNCTION IF EXISTS get_monthly_financial_data(integer);

-- Recreate with correct column name (invoice_date instead of issue_date)
CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer DEFAULT NULL)
RETURNS TABLE (
  month_name text,
  month_number integer,
  year integer,
  revenue numeric,
  purchases numeric,
  margin numeric,
  margin_percentage numeric,
  contracts_count bigint,
  offers_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_year integer;
  user_company_id uuid;
BEGIN
  -- Get company_id for current user
  SELECT company_id INTO user_company_id FROM profiles WHERE id = auth.uid();
  
  -- Default to current year if not specified
  target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  
  RETURN QUERY
  WITH months AS (
    SELECT 
      m.month_num,
      TO_CHAR(make_date(target_year, m.month_num, 1), 'TMMonth') as month_name,
      target_year as year
    FROM generate_series(1, 12) as m(month_num)
  ),
  -- Pre-calculate contract purchases for self-leasing
  contract_purchases AS (
    SELECT 
      c.id as contract_id,
      c.monthly_payment,
      c.contract_duration,
      c.contract_start_date,
      c.contract_end_date,
      COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity), 0) as total_purchase
    FROM contracts c
    LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
    WHERE c.company_id = user_company_id
      AND c.is_self_leasing = true
      AND c.status NOT IN ('cancelled', 'rejected')
    GROUP BY c.id, c.monthly_payment, c.contract_duration, c.contract_start_date, c.contract_end_date
  ),
  -- Self-leasing contracts monthly data
  self_leasing_monthly AS (
    SELECT 
      m.month_num,
      SUM(COALESCE(cp.monthly_payment, 0)) as monthly_revenue,
      SUM(
        CASE 
          WHEN COALESCE(cp.contract_duration, 36) > 0 
          THEN cp.total_purchase / cp.contract_duration
          ELSE 0 
        END
      ) as monthly_purchases
    FROM months m
    CROSS JOIN contract_purchases cp
    WHERE 
      -- Contract is active during this month
      cp.contract_start_date <= (make_date(target_year, m.month_num, 1) + interval '1 month - 1 day')::date
      AND (cp.contract_end_date IS NULL OR cp.contract_end_date >= make_date(target_year, m.month_num, 1))
      -- Contract started in or before target year
      AND EXTRACT(YEAR FROM cp.contract_start_date) <= target_year
    GROUP BY m.month_num
  ),
  -- Invoice-based financial data (using correct column: invoice_date)
  invoice_financials AS (
    SELECT 
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::integer as month_num,
      SUM(i.total_amount - COALESCE(i.credited_amount, 0)) as revenue,
      SUM(
        COALESCE(
          (SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) 
           FROM contract_equipment ce 
           WHERE ce.contract_id = i.contract_id),
          0
        )
      ) as purchases
    FROM invoices i
    INNER JOIN contracts c ON c.id = i.contract_id
    WHERE c.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
      AND i.status NOT IN ('cancelled', 'draft')
      AND (c.is_self_leasing IS NULL OR c.is_self_leasing = false)
    GROUP BY EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::integer
  ),
  -- Contract counts per month
  contract_counts AS (
    SELECT 
      EXTRACT(MONTH FROM c.created_at)::integer as month_num,
      COUNT(*) as contracts_count
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND EXTRACT(YEAR FROM c.created_at) = target_year
      AND c.status NOT IN ('cancelled', 'rejected')
    GROUP BY EXTRACT(MONTH FROM c.created_at)::integer
  ),
  -- Offer counts per month
  offer_counts AS (
    SELECT 
      EXTRACT(MONTH FROM o.created_at)::integer as month_num,
      COUNT(*) as offers_count
    FROM offers o
    WHERE o.company_id = user_company_id
      AND EXTRACT(YEAR FROM o.created_at) = target_year
    GROUP BY EXTRACT(MONTH FROM o.created_at)::integer
  )
  SELECT 
    m.month_name::text,
    m.month_num::integer as month_number,
    m.year::integer,
    COALESCE(inf.revenue, 0) + COALESCE(slm.monthly_revenue, 0) as revenue,
    COALESCE(inf.purchases, 0) + COALESCE(slm.monthly_purchases, 0) as purchases,
    (COALESCE(inf.revenue, 0) + COALESCE(slm.monthly_revenue, 0)) - 
    (COALESCE(inf.purchases, 0) + COALESCE(slm.monthly_purchases, 0)) as margin,
    CASE 
      WHEN (COALESCE(inf.revenue, 0) + COALESCE(slm.monthly_revenue, 0)) > 0 
      THEN ROUND(
        ((COALESCE(inf.revenue, 0) + COALESCE(slm.monthly_revenue, 0)) - 
         (COALESCE(inf.purchases, 0) + COALESCE(slm.monthly_purchases, 0))) * 100.0 / 
        (COALESCE(inf.revenue, 0) + COALESCE(slm.monthly_revenue, 0)), 2
      )
      ELSE 0 
    END as margin_percentage,
    COALESCE(cc.contracts_count, 0)::bigint as contracts_count,
    COALESCE(oc.offers_count, 0)::bigint as offers_count
  FROM months m
  LEFT JOIN invoice_financials inf ON inf.month_num = m.month_num
  LEFT JOIN self_leasing_monthly slm ON slm.month_num = m.month_num
  LEFT JOIN contract_counts cc ON cc.month_num = m.month_num
  LEFT JOIN offer_counts oc ON oc.month_num = m.month_num
  ORDER BY m.month_num;
END;
$$;