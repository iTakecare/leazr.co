-- CA self-leasing = uniquement les factures réellement émises (sli.total_invoiced)
-- L'estimé (contrats actifs sans facture) va UNIQUEMENT dans self_leasing_estimated → prévisionnel
-- Cela s'applique à TOUS les mois : passé, courant, futur

CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer)
RETURNS TABLE(
  month_name text,
  month_number integer,
  year integer,
  revenue numeric,
  direct_sales_revenue numeric,
  self_leasing_revenue numeric,
  self_leasing_estimated numeric,
  purchases numeric,
  margin numeric,
  margin_percentage numeric,
  contracts_count integer,
  offers_count integer,
  credit_notes_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
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
  leasing_revenue AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(i.amount) as total_revenue,
      COUNT(DISTINCT i.contract_id)::integer as contracts_count
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'leasing'
      AND (i.billing_data->>'type' IS DISTINCT FROM 'self_leasing_monthly')
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  ),
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
  direct_sales_purchases AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)) as total_purchases
    FROM invoices i
    JOIN offer_equipment oe ON oe.offer_id = i.offer_id
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'purchase'
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  ),
  credit_notes_cte AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(cn.issued_at, cn.created_at))::integer as month,
      SUM(cn.amount) as total_credit
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at)) = target_year
    GROUP BY 1
  ),
  contract_invoice_in_year AS (
    SELECT DISTINCT ON (i.contract_id)
      i.contract_id,
      i.invoice_date
    FROM invoices i
    WHERE i.invoice_date >= make_date(target_year, 1, 1)
      AND i.invoice_date <= make_date(target_year, 12, 31)
      AND i.invoice_date IS NOT NULL
      AND i.contract_id IS NOT NULL
    ORDER BY i.contract_id, i.invoice_date
  ),
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(
        ce.actual_purchase_date,
        ce.order_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date
      ))::integer as month,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    LEFT JOIN contract_invoice_in_year ciiy ON ciiy.contract_id = c.id
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND COALESCE(
        ce.actual_purchase_date,
        ce.order_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date
      ) IS NOT NULL
      AND COALESCE(ce.actual_purchase_price, ce.purchase_price) > 0
      AND c.status IN ('signed', 'active', 'delivered', 'completed', 'equipment_ordered', 'extended', 'defaulted', 'terminated')
      AND EXTRACT(YEAR FROM COALESCE(
        ce.actual_purchase_date,
        ce.order_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date
      )) = target_year
    GROUP BY 1
  ),
  self_leasing_contracts AS (
    SELECT
      c.id,
      c.monthly_payment,
      COALESCE(c.contract_duration, 36) as duration,
      COALESCE(c.contract_start_date, c.created_at::date) as start_date,
      c.contract_end_date as end_date,
      (SELECT COALESCE(SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1)), 0)
       FROM contract_equipment ce WHERE ce.contract_id = c.id) as total_equipment_cost
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND c.is_self_leasing = true
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
  ),
  self_leasing_by_month AS (
    SELECT
      m.month_num as month,
      -- sl_purchase : coût amorti de l'équipement (toujours compté, facture ou pas)
      SUM(
        CASE
          WHEN make_date(target_year, m.month_num, 1) >= slc.start_date
               AND (slc.end_date IS NULL OR make_date(target_year, m.month_num, 1) <= slc.end_date)
               AND (
                 ((EXTRACT(YEAR FROM make_date(target_year, m.month_num, 1)) - EXTRACT(YEAR FROM slc.start_date)) * 12
                  + EXTRACT(MONTH FROM make_date(target_year, m.month_num, 1)) - EXTRACT(MONTH FROM slc.start_date)) < slc.duration
               )
          THEN slc.total_equipment_cost / NULLIF(slc.duration, 0)
          ELSE 0
        END
      ) as sl_purchase,
      -- sl_estimated : revenus attendus mais PAS encore facturés (tous mois confondus)
      SUM(
        CASE
          WHEN make_date(target_year, m.month_num, 1) >= slc.start_date
               AND (slc.end_date IS NULL OR make_date(target_year, m.month_num, 1) <= slc.end_date)
               AND (
                 ((EXTRACT(YEAR FROM make_date(target_year, m.month_num, 1)) - EXTRACT(YEAR FROM slc.start_date)) * 12
                  + EXTRACT(MONTH FROM make_date(target_year, m.month_num, 1)) - EXTRACT(MONTH FROM slc.start_date)) < slc.duration
               )
               AND NOT EXISTS (
                 SELECT 1 FROM invoices inv
                 WHERE inv.contract_id = slc.id
                   AND EXTRACT(MONTH FROM inv.invoice_date) = m.month_num
                   AND EXTRACT(YEAR FROM inv.invoice_date) = target_year
               )
          THEN slc.monthly_payment
          ELSE 0
        END
      ) as sl_estimated
    FROM months m
    CROSS JOIN self_leasing_contracts slc
    GROUP BY m.month_num
  ),
  self_leasing_invoices AS (
    SELECT
      EXTRACT(MONTH FROM i.invoice_date)::integer as month,
      SUM(i.amount) as total_invoiced
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.billing_data->>'type' = 'self_leasing_monthly'
      AND EXTRACT(YEAR FROM i.invoice_date) = target_year
    GROUP BY 1
  )
  SELECT
    month_names[m.month_num]::text as month_name,
    m.month_num::integer as month_number,
    target_year::integer as year,
    (COALESCE(lr.total_revenue, 0))::numeric as revenue,
    COALESCE(ds.total_sales, 0)::numeric as direct_sales_revenue,
    -- CA self-leasing = UNIQUEMENT les factures réellement émises
    COALESCE(sli.total_invoiced, 0)::numeric as self_leasing_revenue,
    -- Estimé = revenus attendus sans facture (prévisionnel uniquement)
    COALESCE(sl.sl_estimated, 0)::numeric as self_leasing_estimated,
    (COALESCE(ep.total_purchases, 0) + COALESCE(sl.sl_purchase, 0))::numeric as purchases,
    -- Marge sur CA réel uniquement (pas d'estimé)
    (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sli.total_invoiced, 0)
     - COALESCE(cnc.total_credit, 0)
     - COALESCE(ep.total_purchases, 0) - COALESCE(sl.sl_purchase, 0)
     - COALESCE(dsp.total_purchases, 0))::numeric as margin,
    CASE
      WHEN (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sli.total_invoiced, 0)) > 0
      THEN ROUND((((COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sli.total_invoiced, 0)
                   - COALESCE(cnc.total_credit, 0)
                   - COALESCE(ep.total_purchases, 0) - COALESCE(sl.sl_purchase, 0)
                   - COALESCE(dsp.total_purchases, 0))
                  / (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sli.total_invoiced, 0))) * 100)::numeric, 2)
      ELSE 0
    END::numeric as margin_percentage,
    COALESCE(lr.contracts_count, 0)::integer as contracts_count,
    0::integer as offers_count,
    COALESCE(cnc.total_credit, 0)::numeric as credit_notes_amount
  FROM months m
  LEFT JOIN leasing_revenue lr ON lr.month = m.month_num
  LEFT JOIN direct_sales ds ON ds.month = m.month_num
  LEFT JOIN direct_sales_purchases dsp ON dsp.month = m.month_num
  LEFT JOIN credit_notes_cte cnc ON cnc.month = m.month_num
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.month_num
  LEFT JOIN self_leasing_by_month sl ON sl.month = m.month_num
  LEFT JOIN self_leasing_invoices sli ON sli.month = m.month_num
  ORDER BY m.month_num;
END;
$$;
