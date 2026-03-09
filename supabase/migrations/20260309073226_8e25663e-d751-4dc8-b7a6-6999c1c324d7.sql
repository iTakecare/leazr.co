-- 1. Corriger le montant du contrat de Jennifer Meremans (HTVA réel Mollie)
UPDATE contracts SET monthly_payment = 63.92 WHERE id = 'c3e0ac85-33f4-4f13-85d7-72cf169f68f3';

-- 2. Modifier la fonction get_monthly_financial_data pour utiliser les montants Mollie réels
CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer)
RETURNS TABLE(
  month_name text,
  month_number integer,
  year integer,
  revenue numeric,
  direct_sales_revenue numeric,
  self_leasing_revenue numeric,
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
  credit_notes_cte AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(cn.issued_at, cn.created_at))::integer as month,
      SUM(cn.amount) as total_credit
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(cn.issued_at, cn.created_at)) = target_year
    GROUP BY 1
  ),
  equipment_purchases_by_month AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(ce.actual_purchase_date, inv.invoice_date))::integer as month,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    LEFT JOIN invoices inv ON inv.contract_id = c.id
    WHERE c.company_id = user_company_id
      AND COALESCE(c.is_self_leasing, false) = false
      AND COALESCE(ce.actual_purchase_date, inv.invoice_date) IS NOT NULL
      AND COALESCE(ce.actual_purchase_price, ce.purchase_price) > 0
      AND c.status IN ('signed', 'active', 'delivered', 'completed')
      AND EXTRACT(YEAR FROM COALESCE(ce.actual_purchase_date, inv.invoice_date)) = target_year
    GROUP BY 1
  ),
  self_leasing_contracts AS (
    SELECT
      c.id,
      -- Utiliser le dernier montant Mollie modifié (converti en HTVA) si disponible, sinon le montant du contrat
      COALESCE(
        (SELECT msc.new_value::numeric / 1.21
         FROM mollie_sepa_changes msc 
         WHERE msc.contract_id = c.id AND msc.change_type = 'amount'
         ORDER BY msc.created_at DESC LIMIT 1),
        c.monthly_payment
      ) as monthly_payment,
      COALESCE(c.contract_duration, 36) as duration,
      LEAST(
        COALESCE(c.contract_start_date, c.created_at::date),
        COALESCE(
          (SELECT MIN(mpe.created_at)::date FROM mollie_payment_events mpe 
           WHERE mpe.contract_id = c.id AND mpe.status = 'paid' 
           AND mpe.amount > 1),
          '9999-12-31'::date
        ),
        COALESCE(
          (SELECT MIN(msc.new_value::date) FROM mollie_sepa_changes msc 
           WHERE msc.contract_id = c.id AND msc.change_type = 'next_date'),
          '9999-12-31'::date
        )
      ) as start_date,
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
      SUM(
        CASE 
          WHEN (target_year * 12 + m.month_num) >= 
               (EXTRACT(YEAR FROM slc.start_date)::integer * 12 + EXTRACT(MONTH FROM slc.start_date)::integer)
               AND (slc.end_date IS NULL OR make_date(target_year, m.month_num, 1) <= slc.end_date)
               AND (
                 ((target_year - EXTRACT(YEAR FROM slc.start_date)::integer) * 12 
                  + m.month_num - EXTRACT(MONTH FROM slc.start_date)::integer) < slc.duration
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
      ) as sl_revenue,
      SUM(
        CASE 
          WHEN (target_year * 12 + m.month_num) >= 
               (EXTRACT(YEAR FROM slc.start_date)::integer * 12 + EXTRACT(MONTH FROM slc.start_date)::integer)
               AND (slc.end_date IS NULL OR make_date(target_year, m.month_num, 1) <= slc.end_date)
               AND (
                 ((target_year - EXTRACT(YEAR FROM slc.start_date)::integer) * 12 
                  + m.month_num - EXTRACT(MONTH FROM slc.start_date)::integer) < slc.duration
               )
          THEN slc.total_equipment_cost / NULLIF(slc.duration, 0)
          ELSE 0 
        END
      ) as sl_purchase
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
    (COALESCE(sl.sl_revenue, 0) + COALESCE(sli.total_invoiced, 0))::numeric as self_leasing_revenue,
    (COALESCE(ep.total_purchases, 0) + COALESCE(sl.sl_purchase, 0))::numeric as purchases,
    (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sl.sl_revenue, 0) + COALESCE(sli.total_invoiced, 0)
     - COALESCE(cnc.total_credit, 0) - COALESCE(ep.total_purchases, 0) - COALESCE(sl.sl_purchase, 0))::numeric as margin,
    CASE 
      WHEN (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sl.sl_revenue, 0) + COALESCE(sli.total_invoiced, 0)) > 0 
      THEN ROUND((((COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sl.sl_revenue, 0) + COALESCE(sli.total_invoiced, 0)
                   - COALESCE(cnc.total_credit, 0) - COALESCE(ep.total_purchases, 0) - COALESCE(sl.sl_purchase, 0)) 
                  / (COALESCE(lr.total_revenue, 0) + COALESCE(ds.total_sales, 0) + COALESCE(sl.sl_revenue, 0) + COALESCE(sli.total_invoiced, 0))) * 100)::numeric, 2)
      ELSE 0 
    END::numeric as margin_percentage,
    COALESCE(lr.contracts_count, 0)::integer as contracts_count,
    0::integer as offers_count,
    COALESCE(cnc.total_credit, 0)::numeric as credit_notes_amount
  FROM months m
  LEFT JOIN leasing_revenue lr ON lr.month = m.month_num
  LEFT JOIN direct_sales ds ON ds.month = m.month_num
  LEFT JOIN credit_notes_cte cnc ON cnc.month = m.month_num
  LEFT JOIN equipment_purchases_by_month ep ON ep.month = m.month_num
  LEFT JOIN self_leasing_by_month sl ON sl.month = m.month_num
  LEFT JOIN self_leasing_invoices sli ON sli.month = m.month_num
  ORDER BY m.month_num;
END;
$$;