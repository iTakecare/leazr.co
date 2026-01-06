-- Ajouter les colonnes pour le suivi des prix d'achat réels
ALTER TABLE contract_equipment 
ADD COLUMN IF NOT EXISTS actual_purchase_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS purchase_notes TEXT DEFAULT NULL;

-- Mettre à jour la fonction get_monthly_financial_data pour utiliser actual_purchase_price
CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year INTEGER, p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  month INTEGER,
  revenue NUMERIC,
  margin NUMERIC,
  margin_rate NUMERIC,
  contracts_count INTEGER,
  direct_sales_count INTEGER,
  direct_sales_revenue NUMERIC,
  direct_sales_margin NUMERIC,
  estimated_purchase NUMERIC,
  actual_purchase NUMERIC,
  purchase_savings NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_contracts AS (
    SELECT 
      EXTRACT(MONTH FROM i.created_at)::INTEGER as m,
      COUNT(DISTINCT c.id) as cnt,
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) as purchase_total,
      SUM(ce.purchase_price * ce.quantity) as estimated_purchase_total,
      SUM(
        CASE 
          WHEN ce.actual_purchase_price IS NOT NULL 
          THEN (ce.purchase_price - ce.actual_purchase_price) * ce.quantity 
          ELSE 0 
        END
      ) as savings
    FROM invoices i
    JOIN contracts c ON i.contract_id = c.id
    LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
    WHERE EXTRACT(YEAR FROM i.created_at) = p_year
      AND i.status IN ('paid', 'sent', 'pending')
      AND i.invoice_type = 'leaser'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
    GROUP BY EXTRACT(MONTH FROM i.created_at)
  ),
  monthly_direct_sales AS (
    SELECT 
      EXTRACT(MONTH FROM i.created_at)::INTEGER as m,
      COUNT(DISTINCT i.id) as cnt,
      SUM(i.amount) as revenue,
      SUM(
        i.amount - COALESCE(
          (SELECT SUM((item->>'purchase_price')::NUMERIC * COALESCE((item->>'quantity')::NUMERIC, 1))
           FROM jsonb_array_elements(i.billing_data->'equipment_data') as item),
          0
        )
      ) as margin_total
    FROM invoices i
    WHERE EXTRACT(YEAR FROM i.created_at) = p_year
      AND i.status IN ('paid', 'sent', 'pending')
      AND i.invoice_type = 'direct_sale'
      AND (p_company_id IS NULL OR i.company_id = p_company_id)
    GROUP BY EXTRACT(MONTH FROM i.created_at)
  ),
  all_months AS (
    SELECT generate_series(1, 12) as m
  )
  SELECT 
    am.m::INTEGER as month,
    COALESCE(mds.revenue, 0)::NUMERIC as revenue,
    COALESCE(mds.margin_total, 0)::NUMERIC as margin,
    CASE 
      WHEN COALESCE(mds.revenue, 0) > 0 
      THEN (COALESCE(mds.margin_total, 0) / mds.revenue * 100)::NUMERIC 
      ELSE 0 
    END as margin_rate,
    COALESCE(mc.cnt, 0)::INTEGER as contracts_count,
    COALESCE(mds.cnt, 0)::INTEGER as direct_sales_count,
    COALESCE(mds.revenue, 0)::NUMERIC as direct_sales_revenue,
    COALESCE(mds.margin_total, 0)::NUMERIC as direct_sales_margin,
    COALESCE(mc.estimated_purchase_total, 0)::NUMERIC as estimated_purchase,
    COALESCE(mc.purchase_total, 0)::NUMERIC as actual_purchase,
    COALESCE(mc.savings, 0)::NUMERIC as purchase_savings
  FROM all_months am
  LEFT JOIN monthly_contracts mc ON mc.m = am.m
  LEFT JOIN monthly_direct_sales mds ON mds.m = am.m
  ORDER BY am.m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour get_contract_statistics_by_status pour utiliser actual_purchase_price
CREATE OR REPLACE FUNCTION get_contract_statistics_by_status(p_year INTEGER, p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  status TEXT,
  total_amount NUMERIC,
  total_margin NUMERIC,
  contracts_count INTEGER,
  purchase_savings NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- Contrats réalisés (avec facture leaser)
  SELECT 
    'realized'::TEXT as status,
    COALESCE(SUM(i.amount), 0)::NUMERIC as total_amount,
    COALESCE(SUM(i.amount - COALESCE(ce_sum.purchase_total, 0)), 0)::NUMERIC as total_margin,
    COUNT(DISTINCT c.id)::INTEGER as contracts_count,
    COALESCE(SUM(ce_sum.savings), 0)::NUMERIC as purchase_savings
  FROM invoices i
  JOIN contracts c ON i.contract_id = c.id
  LEFT JOIN LATERAL (
    SELECT 
      SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) as purchase_total,
      SUM(
        CASE 
          WHEN ce.actual_purchase_price IS NOT NULL 
          THEN (ce.purchase_price - ce.actual_purchase_price) * ce.quantity 
          ELSE 0 
        END
      ) as savings
    FROM contract_equipment ce 
    WHERE ce.contract_id = c.id
  ) ce_sum ON true
  WHERE EXTRACT(YEAR FROM i.created_at) = p_year
    AND i.status IN ('paid', 'sent', 'pending')
    AND i.invoice_type = 'leaser'
    AND (p_company_id IS NULL OR c.company_id = p_company_id)
  
  UNION ALL
  
  -- Ventes directes
  SELECT 
    'direct_sales'::TEXT as status,
    COALESCE(SUM(i.amount), 0)::NUMERIC as total_amount,
    COALESCE(SUM(
      i.amount - COALESCE(
        (SELECT SUM((item->>'purchase_price')::NUMERIC * COALESCE((item->>'quantity')::NUMERIC, 1))
         FROM jsonb_array_elements(i.billing_data->'equipment_data') as item),
        0
      )
    ), 0)::NUMERIC as total_margin,
    COUNT(DISTINCT i.id)::INTEGER as contracts_count,
    0::NUMERIC as purchase_savings
  FROM invoices i
  WHERE EXTRACT(YEAR FROM i.created_at) = p_year
    AND i.status IN ('paid', 'sent', 'pending')
    AND i.invoice_type = 'direct_sale'
    AND (p_company_id IS NULL OR i.company_id = p_company_id)
  
  UNION ALL
  
  -- En attente (offres acceptées non converties)
  SELECT 
    'pending'::TEXT as status,
    COALESCE(SUM(o.amount), 0)::NUMERIC as total_amount,
    0::NUMERIC as total_margin,
    COUNT(DISTINCT o.id)::INTEGER as contracts_count,
    0::NUMERIC as purchase_savings
  FROM offers o
  WHERE EXTRACT(YEAR FROM o.created_at) = p_year
    AND o.workflow_status = 'accepted'
    AND o.converted_to_contract = false
    AND (p_company_id IS NULL OR o.company_id = p_company_id)
  
  UNION ALL
  
  -- Prévisionnel (contrats sans facture)
  SELECT 
    'forecast'::TEXT as status,
    COALESCE(SUM(c.monthly_payment * c.duration), 0)::NUMERIC as total_amount,
    COALESCE(SUM(
      (c.monthly_payment * c.duration) - COALESCE(ce_sum.purchase_total, 0)
    ), 0)::NUMERIC as total_margin,
    COUNT(DISTINCT c.id)::INTEGER as contracts_count,
    0::NUMERIC as purchase_savings
  FROM contracts c
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) as purchase_total
    FROM contract_equipment ce 
    WHERE ce.contract_id = c.id
  ) ce_sum ON true
  WHERE EXTRACT(YEAR FROM c.created_at) = p_year
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.contract_id = c.id 
        AND i.invoice_type = 'leaser'
        AND i.status IN ('paid', 'sent', 'pending')
    )
    AND (p_company_id IS NULL OR c.company_id = p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;