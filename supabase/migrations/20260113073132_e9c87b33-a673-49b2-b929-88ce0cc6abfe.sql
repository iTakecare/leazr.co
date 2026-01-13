
-- Modifier la fonction get_monthly_financial_data pour utiliser actual_purchase_date
-- au lieu de contract_start_date pour les achats

CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer DEFAULT NULL)
RETURNS TABLE(
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
  month_names text[] := ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
BEGIN
  -- Récupérer le company_id de l'utilisateur courant
  SELECT company_id INTO user_company_id FROM profiles WHERE id = auth.uid();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Utiliser l'année fournie ou l'année courante par défaut
  target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) as month_num
  ),
  -- Revenus mensuels depuis les factures leasing (hors notes de crédit)
  monthly_revenue AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(CASE WHEN i.invoice_type = 'leasing' AND i.amount >= 0 THEN i.amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN i.invoice_type = 'leasing' AND i.amount < 0 THEN ABS(i.amount) ELSE 0 END) as credit_notes
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  ),
  -- Revenus ventes directes depuis les factures purchase
  direct_sales_monthly AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(i.amount) as total_direct_sales
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'purchase'
      AND i.amount > 0
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  ),
  -- NOUVELLE LOGIQUE : Achats basés sur actual_purchase_date (date de demande initiale)
  -- Utilise actual_purchase_price avec fallback sur purchase_price
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM ce.actual_purchase_date)::integer as month,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND ce.actual_purchase_date IS NOT NULL
      AND COALESCE(ce.actual_purchase_price, ce.purchase_price) > 0
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND EXTRACT(YEAR FROM ce.actual_purchase_date) = target_year
    GROUP BY 1
  ),
  -- Contrats signés par mois
  monthly_contracts AS (
    SELECT
      EXTRACT(MONTH FROM c.contract_start_date)::integer as month,
      COUNT(*) as contracts_count
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND EXTRACT(YEAR FROM c.contract_start_date) = target_year
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
    GROUP BY 1
  ),
  -- Offres créées par mois
  monthly_offers AS (
    SELECT
      EXTRACT(MONTH FROM o.created_at)::integer as month,
      COUNT(*) as offers_count
    FROM offers o
    WHERE o.company_id = user_company_id
      AND EXTRACT(YEAR FROM o.created_at) = target_year
    GROUP BY 1
  )
  SELECT
    month_names[m.month_num]::text as month_name,
    m.month_num as month_number,
    target_year as year,
    COALESCE(mr.total_revenue, 0) - COALESCE(mr.credit_notes, 0) as revenue,
    COALESCE(ds.total_direct_sales, 0) as direct_sales_revenue,
    COALESCE(ep.total_purchases, 0) as purchases,
    (COALESCE(mr.total_revenue, 0) - COALESCE(mr.credit_notes, 0) + COALESCE(ds.total_direct_sales, 0)) - COALESCE(ep.total_purchases, 0) as margin,
    CASE 
      WHEN (COALESCE(mr.total_revenue, 0) - COALESCE(mr.credit_notes, 0) + COALESCE(ds.total_direct_sales, 0)) > 0 
      THEN (((COALESCE(mr.total_revenue, 0) - COALESCE(mr.credit_notes, 0) + COALESCE(ds.total_direct_sales, 0)) - COALESCE(ep.total_purchases, 0)) / (COALESCE(mr.total_revenue, 0) - COALESCE(mr.credit_notes, 0) + COALESCE(ds.total_direct_sales, 0))) * 100 
      ELSE 0 
    END as margin_percentage,
    COALESCE(mc.contracts_count, 0)::integer as contracts_count,
    COALESCE(mo.offers_count, 0)::integer as offers_count,
    COALESCE(mr.credit_notes, 0) as credit_notes_amount
  FROM months m
  LEFT JOIN monthly_revenue mr ON mr.month = m.month_num
  LEFT JOIN direct_sales_monthly ds ON ds.month = m.month_num
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.month_num
  LEFT JOIN monthly_contracts mc ON mc.month = m.month_num
  LEFT JOIN monthly_offers mo ON mo.month = m.month_num
  ORDER BY m.month_num;
END;
$$;
