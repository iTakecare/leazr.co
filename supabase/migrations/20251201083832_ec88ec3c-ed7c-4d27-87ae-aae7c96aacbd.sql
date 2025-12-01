-- Replace get_monthly_financial_data to use invoice_date from invoices table
CREATE OR REPLACE FUNCTION public.get_monthly_financial_data()
RETURNS TABLE(
    month_name text,
    month_number integer,
    year integer,
    revenue numeric,
    purchases numeric,
    margin numeric,
    margin_percentage numeric,
    contracts_count integer,
    offers_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id UUID;
    current_year INTEGER := EXTRACT(year FROM now());
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH months AS (
        SELECT 
            generate_series(1, 12) as month_num,
            TO_CHAR(TO_DATE(generate_series(1, 12)::text, 'MM'), 'Month') as month_name
    ),
    -- Financial data based on invoices and their invoice_date
    invoice_financials AS (
        SELECT 
            i.id as invoice_id,
            i.contract_id,
            EXTRACT(month FROM COALESCE(i.invoice_date, i.created_at)) as month_num,
            -- Invoice amount is the revenue (CA)
            COALESCE(i.amount, 0) as revenue,
            -- Get purchases from contract equipment
            COALESCE((
                SELECT SUM(ce.purchase_price * ce.quantity)
                FROM contract_equipment ce 
                WHERE ce.contract_id = i.contract_id
            ), 0) as purchases
        FROM invoices i
        WHERE i.company_id = user_company_id 
            AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = current_year
    ),
    invoice_data AS (
        SELECT 
            inf.month_num,
            COUNT(DISTINCT inf.invoice_id) as invoices_count,
            COUNT(DISTINCT inf.contract_id) as contracts_count,
            SUM(inf.revenue) as total_revenue,
            SUM(inf.purchases) as total_purchases
        FROM invoice_financials inf
        GROUP BY inf.month_num
    )
    SELECT 
        TRIM(m.month_name) as month_name,
        m.month_num as month_number,
        current_year as year,
        COALESCE(id.total_revenue, 0) as revenue,
        COALESCE(id.total_purchases, 0) as purchases,
        COALESCE(id.total_revenue, 0) - COALESCE(id.total_purchases, 0) as margin,
        CASE 
            WHEN COALESCE(id.total_revenue, 0) > 0 
            THEN ROUND(
                ((COALESCE(id.total_revenue, 0) - COALESCE(id.total_purchases, 0)) * 100.0 / 
                 COALESCE(id.total_revenue, 0)), 1
            )
            ELSE 0
        END as margin_percentage,
        COALESCE(id.contracts_count, 0)::INTEGER as contracts_count,
        0::INTEGER as offers_count
    FROM months m
    LEFT JOIN invoice_data id ON m.month_num = id.month_num
    ORDER BY m.month_num;
END;
$$;