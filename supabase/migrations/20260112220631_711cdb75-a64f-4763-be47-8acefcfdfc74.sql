-- Étape 1 : Corriger les actual_purchase_date incorrectement définies
-- (équipements avec une date d'achat mais sans prix réel d'achat)
UPDATE contract_equipment
SET actual_purchase_date = NULL
WHERE actual_purchase_date IS NOT NULL
  AND actual_purchase_price IS NULL;

-- Étape 2 : Recréer la fonction get_monthly_financial_data pour inclure les contrats en propre
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
      SUM(i.amount) as gross_revenue,
      COUNT(DISTINCT i.contract_id) as contracts_count
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'leasing'
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at::date)) = target_year
    GROUP BY 1
  ),
  -- Notes de crédit
  credit_notes_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(cn.issued_at, cn.created_at::date))::integer as month,
      SUM(cn.amount) as total_credit_notes
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at::date)) = target_year
    GROUP BY 1
  ),
  -- Achats équipement contrats classiques (basés sur actual_purchase_date, hors self-leasing)
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM ce.actual_purchase_date)::integer as month,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    WHERE c.company_id = user_company_id
      AND ce.actual_purchase_date IS NOT NULL
      AND ce.actual_purchase_price IS NOT NULL
      AND COALESCE(c.is_self_leasing, false) = false
      AND EXTRACT(YEAR FROM ce.actual_purchase_date) = target_year
    GROUP BY 1
  ),
  -- Self-leasing : calcul du coût total par contrat
  self_leasing_contracts AS (
    SELECT
      c.id as contract_id,
      c.monthly_payment,
      COALESCE(c.contract_duration, 36) as duration,
      COALESCE(c.contract_start_date, c.created_at::date) as start_date,
      c.contract_end_date as end_date,
      (SELECT COALESCE(SUM(COALESCE(ce.purchase_price, 0) * COALESCE(ce.quantity, 1)), 0)
       FROM contract_equipment ce WHERE ce.contract_id = c.id) as total_equipment_cost
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND c.is_self_leasing = true
      AND COALESCE(c.status, '') NOT IN ('cancelled', 'ended')
  ),
  -- Self-leasing réparti par mois actif
  self_leasing_by_active_month AS (
    SELECT
      m.m as month,
      SUM(slc.monthly_payment) as monthly_revenue,
      SUM(slc.total_equipment_cost / GREATEST(slc.duration, 1)) as monthly_purchase
    FROM months m
    CROSS JOIN self_leasing_contracts slc
    WHERE make_date(target_year, m.m, 1) >= slc.start_date
      AND (slc.end_date IS NULL OR make_date(target_year, m.m, 1) <= slc.end_date)
    GROUP BY m.m
  ),
  -- Offres par mois
  offers_by_month AS (
    SELECT
      EXTRACT(MONTH FROM o.created_at)::integer as month,
      COUNT(*) as offers_count
    FROM offers o
    WHERE o.company_id = user_company_id
      AND EXTRACT(YEAR FROM o.created_at)::integer = target_year
    GROUP BY 1
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
    -- Revenue = factures leasing + self-leasing revenu - notes crédit
    ROUND(((COALESCE(li.gross_revenue, 0) + COALESCE(sl.monthly_revenue, 0)) - COALESCE(cn.total_credit_notes, 0))::numeric, 2) as revenue,
    -- Purchases = achats équipement leasing + self-leasing achat mensuel
    ROUND((COALESCE(ep.total_purchases, 0) + COALESCE(sl.monthly_purchase, 0))::numeric, 2) as purchases,
    -- Margin = revenue - purchases
    ROUND((((COALESCE(li.gross_revenue, 0) + COALESCE(sl.monthly_revenue, 0)) - COALESCE(cn.total_credit_notes, 0)) - (COALESCE(ep.total_purchases, 0) + COALESCE(sl.monthly_purchase, 0)))::numeric, 2) as margin,
    -- Margin percentage
    CASE
      WHEN (COALESCE(li.gross_revenue, 0) + COALESCE(sl.monthly_revenue, 0)) > 0
      THEN ROUND(((((COALESCE(li.gross_revenue, 0) + COALESCE(sl.monthly_revenue, 0) - COALESCE(cn.total_credit_notes, 0)) - (COALESCE(ep.total_purchases, 0) + COALESCE(sl.monthly_purchase, 0))) / (COALESCE(li.gross_revenue, 0) + COALESCE(sl.monthly_revenue, 0))) * 100)::numeric, 2)
      ELSE 0::numeric
    END as margin_percentage,
    COALESCE(li.contracts_count, 0)::integer as contracts_count,
    COALESCE(obm.offers_count, 0)::integer as offers_count,
    ROUND(COALESCE(cn.total_credit_notes, 0)::numeric, 2) as credit_notes_amount
  FROM months m
  LEFT JOIN leasing_invoices_by_month li ON li.month = m.m
  LEFT JOIN credit_notes_by_month cn ON cn.month = m.m
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.m
  LEFT JOIN self_leasing_by_active_month sl ON sl.month = m.m
  LEFT JOIN offers_by_month obm ON obm.month = m.m
  ORDER BY m.m;
END;
$$;