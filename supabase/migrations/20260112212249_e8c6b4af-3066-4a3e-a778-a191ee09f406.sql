-- Fix the function to use correct column names (invoice_date instead of issued_at, total_amount -> amount, type -> invoice_type)
DROP FUNCTION IF EXISTS public.get_monthly_financial_data(integer);

CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(p_year integer DEFAULT NULL)
RETURNS TABLE(
  month_name text,
  month_number integer,
  year integer,
  revenue numeric,
  purchases numeric,
  margin numeric,
  margin_percentage numeric,
  contracts_count integer,
  offers_count integer,
  credit_notes_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_year integer;
  user_company_id uuid;
BEGIN
  -- Determine the target year
  IF p_year IS NULL THEN
    target_year := EXTRACT(YEAR FROM CURRENT_DATE);
  ELSE
    target_year := p_year;
  END IF;

  -- Get the user's company_id
  SELECT p.company_id INTO user_company_id
  FROM profiles p
  WHERE p.id = auth.uid();

  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) AS month_num
  ),
  
  -- Credit notes data
  credit_notes_data AS (
    SELECT 
      EXTRACT(MONTH FROM i.invoice_date) as month,
      EXTRACT(YEAR FROM i.invoice_date) as year,
      SUM(i.amount) as credit_notes_total
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'credit_note'
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY EXTRACT(MONTH FROM i.invoice_date), EXTRACT(YEAR FROM i.invoice_date)
  ),
  
  -- Equipment purchases based on actual_purchase_date (excluding self-leasing)
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
    GROUP BY EXTRACT(MONTH FROM ce.actual_purchase_date), EXTRACT(YEAR FROM ce.actual_purchase_date)
  ),
  
  -- Invoice financials (revenue from invoices, purchases only for non-contract invoices)
  invoice_financials AS (
    SELECT 
      EXTRACT(MONTH FROM i.invoice_date) as month,
      EXTRACT(YEAR FROM i.invoice_date) as year,
      SUM(CASE WHEN i.invoice_type = 'standard' OR i.invoice_type IS NULL THEN i.amount ELSE 0 END) as total_revenue,
      -- Purchases only for invoices WITHOUT a contract (direct sales)
      SUM(CASE 
        WHEN (i.invoice_type = 'standard' OR i.invoice_type IS NULL) AND i.contract_id IS NULL THEN
          COALESCE((
            SELECT SUM(
              COALESCE((item->>'purchase_price')::numeric, 0) * 
              COALESCE((item->>'quantity')::numeric, 1)
            )
            FROM jsonb_array_elements(i.billing_data->'equipment_data') AS item
          ), 0)
        ELSE 0
      END) as total_purchases_non_contract
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY EXTRACT(MONTH FROM i.invoice_date), EXTRACT(YEAR FROM i.invoice_date)
  ),
  
  -- Self-leasing monthly amortization
  self_leasing_monthly AS (
    SELECT 
      m.month_num as month,
      target_year as year,
      SUM(
        CASE 
          WHEN c.contract_start_date IS NOT NULL 
            AND c.contract_start_date <= (target_year || '-' || LPAD(m.month_num::text, 2, '0') || '-01')::date + interval '1 month' - interval '1 day'
            AND (c.contract_end_date IS NULL OR c.contract_end_date >= (target_year || '-' || LPAD(m.month_num::text, 2, '0') || '-01')::date)
          THEN (
            SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)), 0)
            FROM contract_equipment ce
            WHERE ce.contract_id = c.id
          ) / NULLIF(c.contract_duration, 0)
          ELSE 0
        END
      ) as monthly_purchase
    FROM months m
    CROSS JOIN contracts c
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = true
      AND c.workflow_status NOT IN ('draft', 'cancelled')
    GROUP BY m.month_num
  ),
  
  -- Contract counts
  contract_counts AS (
    SELECT 
      EXTRACT(MONTH FROM c.created_at) as month,
      EXTRACT(YEAR FROM c.created_at) as year,
      COUNT(*) as total_contracts
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND EXTRACT(YEAR FROM c.created_at) = target_year
      AND c.workflow_status NOT IN ('draft', 'cancelled')
    GROUP BY EXTRACT(MONTH FROM c.created_at), EXTRACT(YEAR FROM c.created_at)
  ),
  
  -- Offer counts
  offer_counts AS (
    SELECT 
      EXTRACT(MONTH FROM o.created_at) as month,
      EXTRACT(YEAR FROM o.created_at) as year,
      COUNT(*) as total_offers
    FROM offers o
    WHERE o.company_id = user_company_id
      AND EXTRACT(YEAR FROM o.created_at) = target_year
    GROUP BY EXTRACT(MONTH FROM o.created_at), EXTRACT(YEAR FROM o.created_at)
  )
  
  SELECT 
    TO_CHAR(TO_DATE(m.month_num::text, 'MM'), 'Month') as month_name,
    m.month_num as month_number,
    target_year as year,
    COALESCE(inf.total_revenue, 0) - COALESCE(cnd.credit_notes_total, 0) as revenue,
    -- Purchases = non-contract invoices + equipment purchases by actual_purchase_date + self-leasing monthly
    COALESCE(inf.total_purchases_non_contract, 0) + 
    COALESCE(epm.total_purchases, 0) + 
    COALESCE(slm.monthly_purchase, 0) as purchases,
    -- Margin
    (COALESCE(inf.total_revenue, 0) - COALESCE(cnd.credit_notes_total, 0)) - 
    (COALESCE(inf.total_purchases_non_contract, 0) + COALESCE(epm.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0)) as margin,
    -- Margin percentage
    CASE 
      WHEN COALESCE(inf.total_revenue, 0) - COALESCE(cnd.credit_notes_total, 0) > 0 THEN
        ROUND(
          (
            (COALESCE(inf.total_revenue, 0) - COALESCE(cnd.credit_notes_total, 0)) - 
            (COALESCE(inf.total_purchases_non_contract, 0) + COALESCE(epm.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0))
          ) / 
          (COALESCE(inf.total_revenue, 0) - COALESCE(cnd.credit_notes_total, 0)) * 100,
          2
        )
      ELSE 0
    END as margin_percentage,
    COALESCE(cc.total_contracts, 0)::integer as contracts_count,
    COALESCE(oc.total_offers, 0)::integer as offers_count,
    COALESCE(cnd.credit_notes_total, 0) as credit_notes_amount
  FROM months m
  LEFT JOIN invoice_financials inf ON inf.month = m.month_num AND inf.year = target_year
  LEFT JOIN credit_notes_data cnd ON cnd.month = m.month_num AND cnd.year = target_year
  LEFT JOIN equipment_purchases_by_month epm ON epm.month = m.month_num AND epm.year = target_year
  LEFT JOIN self_leasing_monthly slm ON slm.month = m.month_num AND slm.year = target_year
  LEFT JOIN contract_counts cc ON cc.month = m.month_num AND cc.year = target_year
  LEFT JOIN offer_counts oc ON oc.month = m.month_num AND oc.year = target_year
  ORDER BY m.month_num;
END;
$$;