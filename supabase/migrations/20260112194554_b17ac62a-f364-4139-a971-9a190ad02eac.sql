-- Modifier get_monthly_financial_data pour comptabiliser les notes de crédit au mois d'émission
-- et non plus au mois de la facture originale

DROP FUNCTION IF EXISTS public.get_monthly_financial_data(integer);

CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(p_year integer DEFAULT NULL::integer)
RETURNS TABLE(
  month_name text,
  month_number integer,
  year integer,
  revenue numeric,
  purchases numeric,
  margin numeric,
  margin_percentage numeric,
  contracts_count bigint,
  offers_count bigint,
  credit_notes_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_year integer;
  user_company_id uuid;
BEGIN
  user_company_id := get_user_company_id();

  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);

  RETURN QUERY
  WITH months AS (
    SELECT
      to_char(make_date(target_year, m, 1), 'TMMonth') as month_name,
      m as month_number,
      target_year as year
    FROM generate_series(1, 12) as m
  ),
  -- Notes de crédit groupées par mois d'ÉMISSION (issued_at)
  credit_notes_by_month AS (
    SELECT
      EXTRACT(MONTH FROM cn.issued_at)::integer as month_num,
      SUM(COALESCE(cn.amount, 0)) as total_credit
    FROM credit_notes cn
    WHERE cn.company_id = user_company_id
      AND EXTRACT(YEAR FROM cn.issued_at) = target_year
    GROUP BY EXTRACT(MONTH FROM cn.issued_at)::integer
  ),
  -- Invoice-based financials - afficher le montant COMPLET des factures (sans soustraire credited_amount)
  invoice_financials AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::integer as month_num,
      -- Montant complet de la facture (pas net)
      SUM(COALESCE(i.amount, 0)) as gross_revenue,
      SUM(
        CASE
          -- If the invoice is fully credited, count 0 purchases
          WHEN i.status = 'credited' OR COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0

          -- Purchases for invoices linked to a contract
          WHEN i.contract_id IS NOT NULL THEN
            COALESCE((
              SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity)
              FROM contract_equipment ce
              WHERE ce.contract_id = i.contract_id
            ), 0)

          -- Purchases for purchase invoices stored in billing_data JSON
          ELSE
            COALESCE((
              SELECT SUM(
                (eq->>'purchase_price')::numeric *
                COALESCE((eq->>'quantity')::numeric, 1)
              )
              FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
            ), 0)
        END
      ) as total_purchases
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
      AND i.status NOT IN ('cancelled')
      AND (
        i.contract_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM contracts c
          WHERE c.id = i.contract_id
            AND c.company_id = user_company_id
            AND c.is_self_leasing = true
        )
      )
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
  contract_counts AS (
    SELECT
      EXTRACT(MONTH FROM created_at)::integer as month_num,
      COUNT(*) as cnt
    FROM contracts
    WHERE company_id = user_company_id
      AND EXTRACT(YEAR FROM created_at) = target_year
    GROUP BY EXTRACT(MONTH FROM created_at)::integer
  ),
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
    -- Revenue = factures brutes - notes de crédit du mois
    ROUND(COALESCE(inf.gross_revenue, 0) + COALESCE(slm.monthly_revenue, 0) - COALESCE(cnm.total_credit, 0), 2) as revenue,
    ROUND(COALESCE(inf.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0), 2) as purchases,
    ROUND(
      (COALESCE(inf.gross_revenue, 0) + COALESCE(slm.monthly_revenue, 0) - COALESCE(cnm.total_credit, 0)) -
      (COALESCE(inf.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0)),
      2
    ) as margin,
    CASE
      WHEN (COALESCE(inf.gross_revenue, 0) + COALESCE(slm.monthly_revenue, 0) - COALESCE(cnm.total_credit, 0)) > 0
      THEN ROUND(
        ((COALESCE(inf.gross_revenue, 0) + COALESCE(slm.monthly_revenue, 0) - COALESCE(cnm.total_credit, 0)) -
         (COALESCE(inf.total_purchases, 0) + COALESCE(slm.monthly_purchase, 0))) /
        (COALESCE(inf.gross_revenue, 0) + COALESCE(slm.monthly_revenue, 0) - COALESCE(cnm.total_credit, 0)) * 100,
        2
      )
      ELSE 0
    END as margin_percentage,
    COALESCE(cc.cnt, 0) as contracts_count,
    COALESCE(oc.cnt, 0) as offers_count,
    ROUND(COALESCE(cnm.total_credit, 0), 2) as credit_notes_amount
  FROM months m
  LEFT JOIN invoice_financials inf ON inf.month_num = m.month_number
  LEFT JOIN self_leasing_monthly slm ON slm.month_num = m.month_number
  LEFT JOIN credit_notes_by_month cnm ON cnm.month_num = m.month_number
  LEFT JOIN contract_counts cc ON cc.month_num = m.month_number
  LEFT JOIN offer_counts oc ON oc.month_num = m.month_number
  ORDER BY m.month_number;
END;
$$;