-- Étape 1: Mettre actual_purchase_date = NULL pour le contrat 7dce478f (matériel déjà acheté en décembre 2025)
UPDATE contract_equipment
SET actual_purchase_date = NULL
WHERE contract_id = '7dce478f-6538-47bb-92a6-74f193972e49';

-- Étape 2: Modifier la fonction get_monthly_financial_data pour utiliser actual_purchase_date
CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(user_company_id uuid)
RETURNS TABLE(
  month integer,
  year integer,
  revenue numeric,
  purchases numeric,
  margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Revenus mensuels basés sur les factures (date de facture)
  monthly_revenue AS (
    SELECT
      EXTRACT(MONTH FROM COALESCE(i.invoice_date, i.created_at))::integer as invoice_month,
      EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at))::integer as invoice_year,
      SUM(
        CASE 
          WHEN i.invoice_type = 'credit_note' THEN -COALESCE(i.amount, 0)
          ELSE COALESCE(i.amount, 0)
        END
      ) as total_revenue
    FROM invoices i
    WHERE i.company_id = user_company_id
    GROUP BY invoice_month, invoice_year
  ),
  
  -- Achats basés sur actual_purchase_date des équipements (uniquement si date renseignée)
  equipment_purchases AS (
    SELECT
      EXTRACT(MONTH FROM ce.actual_purchase_date)::integer as purchase_month,
      EXTRACT(YEAR FROM ce.actual_purchase_date)::integer as purchase_year,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price, 0) * COALESCE(ce.quantity, 1)) as total_purchases
    FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    WHERE c.company_id = user_company_id
      AND ce.actual_purchase_date IS NOT NULL  -- Seulement si date d'achat renseignée
    GROUP BY purchase_month, purchase_year
  ),
  
  -- Combiner tous les mois/années possibles
  all_periods AS (
    SELECT invoice_month as period_month, invoice_year as period_year FROM monthly_revenue
    UNION
    SELECT purchase_month, purchase_year FROM equipment_purchases
  )
  
  SELECT
    ap.period_month as month,
    ap.period_year as year,
    COALESCE(mr.total_revenue, 0) as revenue,
    COALESCE(ep.total_purchases, 0) as purchases,
    COALESCE(mr.total_revenue, 0) - COALESCE(ep.total_purchases, 0) as margin
  FROM all_periods ap
  LEFT JOIN monthly_revenue mr ON mr.invoice_month = ap.period_month AND mr.invoice_year = ap.period_year
  LEFT JOIN equipment_purchases ep ON ep.purchase_month = ap.period_month AND ep.purchase_year = ap.period_year
  ORDER BY ap.period_year DESC, ap.period_month DESC;
END;
$$;