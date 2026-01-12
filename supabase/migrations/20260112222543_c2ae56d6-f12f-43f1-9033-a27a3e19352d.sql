-- Mettre à jour get_monthly_financial_data pour inclure les ventes directes et corriger les achats
DROP FUNCTION IF EXISTS public.get_monthly_financial_data(integer);

CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(p_year integer DEFAULT NULL)
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
BEGIN
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = auth.uid();

  target_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) as m
  ),
  -- Factures leasing classiques
  leasing_invoices_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at::date))::integer as month,
      EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at::date))::integer as year,
      SUM(i.amount) as gross_revenue,
      COUNT(DISTINCT i.contract_id) as contracts_count
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'leasing'
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at::date)) = target_year
    GROUP BY 1, 2
  ),
  -- NOUVEAU: Factures de vente directe (type = 'purchase')
  direct_sales_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at::date))::integer as month,
      EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at::date))::integer as year,
      SUM(i.amount) as direct_sales
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'purchase'
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at::date)) = target_year
    GROUP BY 1, 2
  ),
  credit_notes_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(cn.issued_at, cn.created_at::date))::integer as month,
      EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at::date))::integer as year,
      SUM(cn.amount) as total_credit_notes
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at::date)) = target_year
    GROUP BY 1, 2
  ),
  -- MODIFIÉ: Utiliser contract_start_date comme fallback si actual_purchase_date est NULL
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(ce.actual_purchase_date, c.contract_start_date, c.created_at::date))::integer as month,
      EXTRACT(YEAR FROM COALESCE(ce.actual_purchase_date, c.contract_start_date, c.created_at::date))::integer as year,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    WHERE c.company_id = user_company_id
      AND ce.actual_purchase_price IS NOT NULL
      AND COALESCE(c.is_self_leasing, false) = false
      AND EXTRACT(YEAR FROM COALESCE(ce.actual_purchase_date, c.contract_start_date, c.created_at::date)) = target_year
    GROUP BY 1, 2
  ),
  offers_by_month AS (
    SELECT
      EXTRACT(MONTH FROM o.created_at)::integer as month,
      EXTRACT(YEAR FROM o.created_at)::integer as year,
      COUNT(*) as offers_count
    FROM offers o
    WHERE o.company_id = user_company_id
      AND EXTRACT(YEAR FROM o.created_at)::integer = target_year
    GROUP BY 1, 2
  )
  SELECT
    (CASE m.m
      WHEN 1 THEN 'Janvier'
      WHEN 2 THEN 'Février'
      WHEN 3 THEN 'Mars'
      WHEN 4 THEN 'Avril'
      WHEN 5 THEN 'Mai'
      WHEN 6 THEN 'Juin'
      WHEN 7 THEN 'Juillet'
      WHEN 8 THEN 'Août'
      WHEN 9 THEN 'Septembre'
      WHEN 10 THEN 'Octobre'
      WHEN 11 THEN 'Novembre'
      WHEN 12 THEN 'Décembre'
    END)::text as month_name,
    m.m::integer as month_number,
    target_year as year,
    -- revenue = CA leasing NET (brut - notes de crédit)
    (COALESCE(li.gross_revenue, 0) - COALESCE(cn.total_credit_notes, 0))::numeric as revenue,
    -- NOUVEAU: CA ventes directes
    COALESCE(ds.direct_sales, 0)::numeric as direct_sales_revenue,
    -- Achats (avec fallback sur contract_start_date)
    COALESCE(ep.total_purchases, 0)::numeric as purchases,
    -- Marge = (CA leasing + CA ventes directes - notes de crédit) - achats
    ((COALESCE(li.gross_revenue, 0) + COALESCE(ds.direct_sales, 0) - COALESCE(cn.total_credit_notes, 0)) - COALESCE(ep.total_purchases, 0))::numeric as margin,
    CASE
      WHEN (COALESCE(li.gross_revenue, 0) + COALESCE(ds.direct_sales, 0)) > 0
      THEN ((((COALESCE(li.gross_revenue, 0) + COALESCE(ds.direct_sales, 0) - COALESCE(cn.total_credit_notes, 0)) - COALESCE(ep.total_purchases, 0)) / (COALESCE(li.gross_revenue, 0) + COALESCE(ds.direct_sales, 0))) * 100)::numeric
      ELSE 0::numeric
    END as margin_percentage,
    COALESCE(li.contracts_count, 0)::integer as contracts_count,
    COALESCE(obm.offers_count, 0)::integer as offers_count,
    COALESCE(cn.total_credit_notes, 0)::numeric as credit_notes_amount
  FROM months m
  LEFT JOIN leasing_invoices_by_month li ON li.month = m.m AND li.year = target_year
  LEFT JOIN direct_sales_by_month ds ON ds.month = m.m AND ds.year = target_year
  LEFT JOIN credit_notes_by_month cn ON cn.month = m.m AND cn.year = target_year
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.m AND ep.year = target_year
  LEFT JOIN offers_by_month obm ON obm.month = m.m AND obm.year = target_year
  ORDER BY m.m;
END;
$$;