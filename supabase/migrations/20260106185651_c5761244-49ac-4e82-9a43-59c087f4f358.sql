-- Supprimer les fonctions problématiques
DROP FUNCTION IF EXISTS get_monthly_financial_data(INTEGER, UUID);
DROP FUNCTION IF EXISTS get_contract_statistics_by_status();

-- Recréer la fonction get_monthly_financial_data avec support des prix d'achat réels
CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  month_name TEXT,
  month_number INTEGER,
  year INTEGER,
  revenue NUMERIC,
  purchases NUMERIC,
  margin NUMERIC,
  margin_percentage NUMERIC,
  contracts_count INTEGER,
  offers_count INTEGER
) AS $$
DECLARE
    user_company_id UUID;
    target_year INTEGER := COALESCE(p_year, EXTRACT(year FROM now())::INTEGER);
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH months AS (
        SELECT 
            generate_series(1, 12) as month_num,
            TO_CHAR(TO_DATE(generate_series(1, 12)::text, 'MM'), 'Month') as m_name
    ),
    invoice_financials AS (
        SELECT 
            i.id as invoice_id,
            i.contract_id,
            EXTRACT(month FROM COALESCE(i.invoice_date, i.created_at)) as month_num,
            COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0) as revenue,
            CASE 
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                WHEN i.contract_id IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM(
                            COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity
                        )
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = i.contract_id
                    ), 0) * 
                    (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
                ELSE
                    COALESCE((
                        SELECT SUM(
                            (eq->>'purchase_price')::numeric * 
                            COALESCE((eq->>'quantity')::numeric, 1)
                        )
                        FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
                    ), 0) * 
                    (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
            END as purchases
        FROM invoices i
        WHERE i.company_id = user_company_id 
            AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year
    ),
    invoice_data AS (
        SELECT 
            inf.month_num,
            COUNT(DISTINCT inf.invoice_id) as invoices_count,
            COUNT(DISTINCT inf.contract_id) as contracts_cnt,
            SUM(inf.revenue) as total_revenue,
            SUM(inf.purchases) as total_purchases
        FROM invoice_financials inf
        GROUP BY inf.month_num
    )
    SELECT 
        TRIM(m.m_name)::TEXT as month_name,
        m.month_num::INTEGER as month_number,
        target_year as year,
        COALESCE(id.total_revenue, 0)::NUMERIC as revenue,
        COALESCE(id.total_purchases, 0)::NUMERIC as purchases,
        (COALESCE(id.total_revenue, 0) - COALESCE(id.total_purchases, 0))::NUMERIC as margin,
        CASE 
            WHEN COALESCE(id.total_revenue, 0) > 0 
            THEN ROUND(
                ((COALESCE(id.total_revenue, 0) - COALESCE(id.total_purchases, 0)) * 100.0 / 
                 COALESCE(id.total_revenue, 0)), 1
            )
            ELSE 0
        END::NUMERIC as margin_percentage,
        COALESCE(id.contracts_cnt, 0)::INTEGER as contracts_count,
        0::INTEGER as offers_count
    FROM months m
    LEFT JOIN invoice_data id ON m.month_num = id.month_num
    ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer get_contract_statistics_by_status avec support des prix d'achat réels
CREATE OR REPLACE FUNCTION get_contract_statistics_by_status()
RETURNS TABLE (
    status TEXT,
    total_monthly_payment NUMERIC,
    total_commission NUMERIC,
    total_margin NUMERIC,
    contracts_count BIGINT
) AS $$
DECLARE
    user_company_id UUID;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.status::TEXT,
        COALESCE(SUM(c.monthly_payment), 0)::NUMERIC as total_monthly_payment,
        COALESCE(SUM(c.commission), 0)::NUMERIC as total_commission,
        COALESCE(SUM(
            CASE 
                WHEN c.status IN ('active', 'signed') THEN
                    (c.monthly_payment * COALESCE(c.duration, 36)) - 
                    COALESCE((
                        SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity)
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = c.id
                    ), 0)
                ELSE 0
            END
        ), 0)::NUMERIC as total_margin,
        COUNT(*)::BIGINT as contracts_count
    FROM contracts c
    WHERE c.company_id = user_company_id
    GROUP BY c.status
    ORDER BY c.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;