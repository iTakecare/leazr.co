-- Recréer la fonction get_monthly_financial_data avec tous les champs attendus
DROP FUNCTION IF EXISTS get_monthly_financial_data(integer);

CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer)
RETURNS TABLE (
  month_name text,
  month_number integer,
  year integer,
  revenue numeric,
  direct_sales_revenue numeric,
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
  user_company_id uuid;
  target_year integer;
  month_names text[] := ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
BEGIN
  SELECT company_id INTO user_company_id FROM profiles WHERE id = auth.uid();
  target_year := p_year;
  
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) as month_num
  ),
  -- CA des factures leasing par mois
  leasing_revenue AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(i.amount) as total_revenue
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'leasing'
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  ),
  -- CA des ventes directes (factures purchase) par mois
  direct_sales AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(i.amount) as total_sales
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'purchase'
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  ),
  -- Notes de crédit par mois
  credit_notes AS (
    SELECT
      EXTRACT(MONTH FROM cn.credit_note_date)::integer as month,
      SUM(cn.total_amount) as total_credit
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM cn.credit_note_date) = target_year
    GROUP BY 1
  ),
  -- Achats par mois (priorité: actual_purchase_date > invoice_date)
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(ce.actual_purchase_date, i.invoice_date))::integer as month,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    LEFT JOIN invoices i ON i.contract_id = c.id
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND COALESCE(ce.actual_purchase_date, i.invoice_date) IS NOT NULL
      AND COALESCE(ce.actual_purchase_price, ce.purchase_price) > 0
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND EXTRACT(YEAR FROM COALESCE(ce.actual_purchase_date, i.invoice_date)) = target_year
    GROUP BY 1
  ),
  -- Nombre de contrats par mois
  contracts_by_month AS (
    SELECT
      EXTRACT(MONTH FROM c.contract_start_date)::integer as month,
      COUNT(*) as contract_count
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND EXTRACT(YEAR FROM c.contract_start_date) = target_year
    GROUP BY 1
  )
  SELECT 
    month_names[m.month_num]::text as month_name,
    m.month_num::integer as month_number,
    target_year::integer as year,
    COALESCE(lr.total_revenue, 0)::numeric as revenue,
    COALESCE(ds.total_sales, 0)::numeric as direct_sales_revenue,
    COALESCE(ep.total_purchases, 0)::numeric as purchases,
    (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) 
     - COALESCE(cn.total_credit, 0) - COALESCE(ep.total_purchases, 0))::numeric as margin,
    CASE 
      WHEN (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0)) > 0 
      THEN ROUND((((COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) 
                   - COALESCE(cn.total_credit, 0) - COALESCE(ep.total_purchases, 0)) 
                  / (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0))) * 100)::numeric, 2)
      ELSE 0 
    END::numeric as margin_percentage,
    COALESCE(cb.contract_count, 0)::integer as contracts_count,
    0::integer as offers_count,
    COALESCE(cn.total_credit, 0)::numeric as credit_notes_amount
  FROM months m
  LEFT JOIN leasing_revenue lr ON lr.month = m.month_num
  LEFT JOIN direct_sales ds ON ds.month = m.month_num
  LEFT JOIN credit_notes cn ON cn.month = m.month_num
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.month_num
  LEFT JOIN contracts_by_month cb ON cb.month = m.month_num
  ORDER BY m.month_num;
END;
$$;