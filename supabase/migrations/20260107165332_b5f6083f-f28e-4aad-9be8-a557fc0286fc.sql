-- Drop existing function with p_year parameter
DROP FUNCTION IF EXISTS public.get_monthly_financial_data(integer);

-- Recreate the function with correct column names
CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(p_year integer DEFAULT NULL)
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
SET search_path = public
AS $$
DECLARE
  target_year integer;
  user_company_id uuid;
BEGIN
  -- Get company_id for current user
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Use provided year or current year
  target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);

  RETURN QUERY
  WITH months AS (
    SELECT 
      to_char(make_date(target_year, m, 1), 'TMMonth') as month_name,
      m as month_number,
      target_year as year
    FROM generate_series(1, 12) as m
  ),
  -- Invoice-based financials (using correct column name: amount instead of total_amount)
  invoice_financials AS (
    SELECT 
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::integer as month_num,
      SUM(COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0)) as net_revenue,
      SUM(
        CASE 
          WHEN i.total_purchase_price IS NOT NULL THEN i.total_purchase_price
          ELSE COALESCE(i.amount, 0) * 0.7
        END
      ) as total_purchases
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
      AND i.status NOT IN ('cancelled', 'credited')
    GROUP BY EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::integer
  ),
  -- Self-leasing contracts: monthly revenue + amortized purchases
  contract_purchases AS (
    SELECT 
      c.id as contract_id,
      c.monthly_payment,
      c.contract_start_date,
      c.contract_end_date,
      COALESCE(NULLIF(c.contract_duration, 0), 36) as contract_duration,
      COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity), 0) as total_purchase
    FROM contracts c
    LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
    WHERE c.company_id = user_company_id
      AND c.is_self_leasing = true
      AND c.status NOT IN ('cancelled', 'rejected')
    GROUP BY c.id, c.monthly_payment, c.contract_start_date, c.contract_end_date, c.contract_duration
  ),
  self_leasing_monthly AS (
    SELECT 
      m.month_number as month_num,
      SUM(
        CASE 
          WHEN cp.contract_start_date <= (make_date(target_year, m.month_number, 1) + interval '1 month - 1 day')::date
            AND (cp.contract_end_date IS NULL OR cp.contract_end_date >= make_date(target_year, m.month_number, 1))
          THEN COALESCE(cp.monthly_payment, 0)
          ELSE 0
        END
      ) as monthly_revenue,
      SUM(
        CASE 
          WHEN cp.contract_start_date <= (make_date(target_year, m.month_number, 1) + interval '1 month - 1 day')::date
            AND (cp.contract_end_date IS NULL OR cp.contract_end_date >= make_date(target_year, m.month_number, 1))
          THEN cp.total_purchase / cp.contract_duration
          ELSE 0
        END
      ) as monthly_purchase
    FROM months m
    CROSS JOIN contract_purchases cp
    GROUP BY m.month_number
  ),
  -- Count contracts created per month
  contract_counts AS (
    SELECT 
      EXTRACT(MONTH FROM created_at)::integer as month_num,
      COUNT(*) as cnt
    FROM contracts
    WHERE company_id = user_company_id
      AND EXTRACT(YEAR FROM created_at) = target_year
    GROUP BY EXTRACT(MONTH FROM created_at)::integer
  ),
  -- Count offers created per month
  offer_counts AS (
    SELECT 
      EXTRACT(MONTH FROM created_at)::integer as month_num,
      COUNT(*) as cnt
    FROM offers
    WHERE company_id = user_company_id
      AND EXTRACT(YEAR FROM created_at) = target_year
    GROUP BY EXTRACT(MONTH FROM created_at)::integer
  )
  SELECT 
    m.month_name,
    m.month_number,
    m.year,
    ROUND(COALESCE(inf.net_revenue, 0) + COALESCE(slm.monthly_revenue, 0), 2) as revenue,
    ROUND(COALESCE(inf.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0), 2) as purchases,
    ROUND(
      (COALESCE(inf.net_revenue, 0) + COALESCE(slm.monthly_revenue, 0)) - 
      (COALESCE(inf.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0)), 
      2
    ) as margin,
    CASE 
      WHEN (COALESCE(inf.net_revenue, 0) + COALESCE(slm.monthly_revenue, 0)) > 0 
      THEN ROUND(
        ((COALESCE(inf.net_revenue, 0) + COALESCE(slm.monthly_revenue, 0)) - 
         (COALESCE(inf.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0))) / 
        (COALESCE(inf.net_revenue, 0) + COALESCE(slm.monthly_revenue, 0)) * 100, 
        2
      )
      ELSE 0
    END as margin_percentage,
    COALESCE(cc.cnt, 0) as contracts_count,
    COALESCE(oc.cnt, 0) as offers_count
  FROM months m
  LEFT JOIN invoice_financials inf ON inf.month_num = m.month_number
  LEFT JOIN self_leasing_monthly slm ON slm.month_num = m.month_number
  LEFT JOIN contract_counts cc ON cc.month_num = m.month_number
  LEFT JOIN offer_counts oc ON oc.month_num = m.month_number
  ORDER BY m.month_number;
END;
$$;