-- Étape 1: Mettre à jour actual_purchase_date avec la date de facture
UPDATE contract_equipment ce
SET 
  actual_purchase_date = i.invoice_date::date
FROM contracts c
JOIN invoices i ON i.contract_id = c.id
WHERE ce.contract_id = c.id
  AND c.status IN ('active', 'signed', 'delivered')
  AND i.invoice_date IS NOT NULL;

-- Étape 2: Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_monthly_financial_data(integer);

-- Étape 3: Recréer la fonction avec priorité actual_purchase_date > invoice_date
CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer)
RETURNS TABLE (
  month integer,
  revenue numeric,
  purchases numeric,
  margin numeric,
  margin_rate numeric,
  active_contracts integer,
  new_contracts integer,
  renewed_contracts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
  target_year integer;
BEGIN
  SELECT company_id INTO user_company_id FROM profiles WHERE id = auth.uid();
  target_year := p_year;
  
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) as month_num
  ),
  monthly_revenue AS (
    SELECT
      EXTRACT(MONTH FROM c.contract_start_date)::integer as month,
      SUM(c.monthly_payment) as total_revenue
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND c.monthly_payment IS NOT NULL
      AND c.monthly_payment > 0
      AND c.contract_start_date IS NOT NULL
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND EXTRACT(YEAR FROM c.contract_start_date) = target_year
    GROUP BY 1
  ),
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
  active_contracts_by_month AS (
    SELECT
      m.month_num as month,
      COUNT(DISTINCT c.id) as contract_count
    FROM months m
    LEFT JOIN contracts c ON 
      c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND c.contract_start_date IS NOT NULL
      AND EXTRACT(YEAR FROM c.contract_start_date) = target_year
      AND EXTRACT(MONTH FROM c.contract_start_date) <= m.month_num
      AND (
        c.contract_end_date IS NULL 
        OR EXTRACT(YEAR FROM c.contract_end_date) > target_year
        OR (EXTRACT(YEAR FROM c.contract_end_date) = target_year AND EXTRACT(MONTH FROM c.contract_end_date) >= m.month_num)
      )
    GROUP BY m.month_num
  ),
  new_contracts_by_month AS (
    SELECT
      EXTRACT(MONTH FROM c.contract_start_date)::integer as month,
      COUNT(*) as new_count
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND c.contract_start_date IS NOT NULL
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND EXTRACT(YEAR FROM c.contract_start_date) = target_year
    GROUP BY 1
  )
  SELECT 
    m.month_num::integer as month,
    COALESCE(mr.total_revenue, 0)::numeric as revenue,
    COALESCE(ep.total_purchases, 0)::numeric as purchases,
    (COALESCE(mr.total_revenue, 0) - COALESCE(ep.total_purchases, 0))::numeric as margin,
    CASE 
      WHEN COALESCE(mr.total_revenue, 0) > 0 
      THEN ROUND(((COALESCE(mr.total_revenue, 0) - COALESCE(ep.total_purchases, 0)) / COALESCE(mr.total_revenue, 0) * 100)::numeric, 2)
      ELSE 0 
    END::numeric as margin_rate,
    COALESCE(ac.contract_count, 0)::integer as active_contracts,
    COALESCE(nc.new_count, 0)::integer as new_contracts,
    0::integer as renewed_contracts
  FROM months m
  LEFT JOIN monthly_revenue mr ON mr.month = m.month_num
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.month_num
  LEFT JOIN active_contracts_by_month ac ON ac.month = m.month_num
  LEFT JOIN new_contracts_by_month nc ON nc.month = m.month_num
  ORDER BY m.month_num;
END;
$$;