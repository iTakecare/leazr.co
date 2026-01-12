
-- Modifier la fonction get_monthly_financial_data pour comptabiliser les achats
-- même si la facture est créditée ultérieurement
-- Les achats sont liés à la date de la facture originale, pas à la note de crédit

CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_company_id UUID, p_year INTEGER)
RETURNS TABLE (
  month_number INTEGER,
  month_name TEXT,
  revenue NUMERIC,
  purchases NUMERIC,
  margin NUMERIC,
  margin_percentage NUMERIC,
  credit_notes_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(1, 12) AS month_num
  ),
  -- Données des factures (CA brut et achats)
  invoice_financials AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::INTEGER as invoice_month,
      -- CA brut des factures (avant notes de crédit)
      SUM(COALESCE(i.amount, 0)) as total_revenue,
      -- Achats : TOUJOURS comptabilisés, même si la facture est créditée après
      SUM(
        CASE
          -- Achats pour factures liées à un contrat
          WHEN i.contract_id IS NOT NULL THEN
            COALESCE((
              SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity)
              FROM contract_equipment ce
              WHERE ce.contract_id = i.contract_id
            ), 0)
          -- Achats pour factures d'achat (via billing_data)
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
    WHERE i.company_id = p_company_id
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = p_year
    GROUP BY EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))
  ),
  -- Notes de crédit (réduisent le CA du mois d'émission)
  credit_note_financials AS (
    SELECT
      EXTRACT(MONTH FROM cn.issued_at)::INTEGER as credit_month,
      SUM(COALESCE(cn.amount, 0)) as total_credit_notes
    FROM credit_notes cn
    WHERE cn.company_id = p_company_id
      AND EXTRACT(YEAR FROM cn.issued_at) = p_year
    GROUP BY EXTRACT(MONTH FROM cn.issued_at)
  )
  SELECT
    m.month_num::INTEGER as month_number,
    TO_CHAR(TO_DATE(m.month_num::TEXT, 'MM'), 'Month') as month_name,
    -- CA net = CA brut - notes de crédit du mois
    COALESCE(inv.total_revenue, 0) - COALESCE(cn.total_credit_notes, 0) as revenue,
    COALESCE(inv.total_purchases, 0) as purchases,
    -- Marge = CA net - achats
    (COALESCE(inv.total_revenue, 0) - COALESCE(cn.total_credit_notes, 0) - COALESCE(inv.total_purchases, 0)) as margin,
    -- Pourcentage de marge
    CASE
      WHEN (COALESCE(inv.total_revenue, 0) - COALESCE(cn.total_credit_notes, 0)) > 0 THEN
        ROUND(
          ((COALESCE(inv.total_revenue, 0) - COALESCE(cn.total_credit_notes, 0) - COALESCE(inv.total_purchases, 0)) /
          (COALESCE(inv.total_revenue, 0) - COALESCE(cn.total_credit_notes, 0))) * 100,
          2
        )
      ELSE 0
    END as margin_percentage,
    COALESCE(cn.total_credit_notes, 0) as credit_notes_amount
  FROM months m
  LEFT JOIN invoice_financials inv ON m.month_num = inv.invoice_month
  LEFT JOIN credit_note_financials cn ON m.month_num = cn.credit_month
  ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
