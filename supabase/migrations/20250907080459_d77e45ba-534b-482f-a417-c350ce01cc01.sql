-- Create function to get monthly financial data from offers and contracts
CREATE OR REPLACE FUNCTION public.get_monthly_financial_data()
RETURNS TABLE(
    month_name TEXT,
    month_number INTEGER,
    year INTEGER,
    revenue NUMERIC,
    purchases NUMERIC,
    margin NUMERIC,
    margin_percentage NUMERIC,
    contracts_count INTEGER,
    offers_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id UUID;
    current_year INTEGER := EXTRACT(year FROM now());
BEGIN
    -- Get user's company ID
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Generate monthly data for current year
    RETURN QUERY
    WITH months AS (
        SELECT 
            generate_series(1, 12) as month_num,
            TO_CHAR(TO_DATE(generate_series(1, 12)::text, 'MM'), 'Month') as month_name
    ),
    contract_data AS (
        SELECT 
            EXTRACT(month FROM c.created_at) as month_num,
            COUNT(*) as contracts_count,
            COALESCE(SUM(c.monthly_payment), 0) as revenue_from_contracts,
            COALESCE(SUM(c.monthly_payment * 0.7), 0) as purchases_from_contracts -- Estimate 70% as purchase cost
        FROM contracts c
        WHERE c.company_id = user_company_id 
            AND c.status = 'active'
            AND EXTRACT(year FROM c.created_at) = current_year
        GROUP BY EXTRACT(month FROM c.created_at)
    ),
    offer_data AS (
        SELECT 
            EXTRACT(month FROM o.created_at) as month_num,
            COUNT(*) as offers_count,
            COALESCE(SUM(o.amount), 0) as revenue_from_offers,
            COALESCE(SUM(o.amount - COALESCE(o.commission, 0)), 0) as purchases_from_offers
        FROM offers o
        WHERE o.company_id = user_company_id 
            AND o.status = 'accepted'
            AND o.converted_to_contract = true
            AND EXTRACT(year FROM o.created_at) = current_year
        GROUP BY EXTRACT(month FROM o.created_at)
    )
    SELECT 
        TRIM(m.month_name) as month_name,
        m.month_num as month_number,
        current_year as year,
        COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0) as revenue,
        COALESCE(cd.purchases_from_contracts, 0) + COALESCE(od.purchases_from_offers, 0) as purchases,
        (COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0)) - 
        (COALESCE(cd.purchases_from_contracts, 0) + COALESCE(od.purchases_from_offers, 0)) as margin,
        CASE 
            WHEN (COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0)) > 0 
            THEN ROUND(
                (((COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0)) - 
                  (COALESCE(cd.purchases_from_contracts, 0) + COALESCE(od.purchases_from_offers, 0))) * 100.0 / 
                 (COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0))), 1
            )
            ELSE 0
        END as margin_percentage,
        COALESCE(cd.contracts_count, 0) as contracts_count,
        COALESCE(od.offers_count, 0) as offers_count
    FROM months m
    LEFT JOIN contract_data cd ON m.month_num = cd.month_num
    LEFT JOIN offer_data od ON m.month_num = od.month_num
    ORDER BY m.month_num;
END;
$$;

-- Create function to get detailed contract statistics by status
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status()
RETURNS TABLE(
    status TEXT,
    count INTEGER,
    total_revenue NUMERIC,
    total_purchases NUMERIC,
    total_margin NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id UUID;
BEGIN
    -- Get user's company ID
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get statistics by status
    RETURN QUERY
    SELECT 
        CASE 
            WHEN c.status = 'active' THEN 'realized'
            WHEN c.status = 'pending' OR c.status = 'draft' THEN 'pending'
            ELSE 'refused'
        END as status,
        COUNT(*)::INTEGER as count,
        COALESCE(SUM(c.monthly_payment), 0) as total_revenue,
        COALESCE(SUM(c.monthly_payment * 0.7), 0) as total_purchases, -- Estimate 70% as purchase cost
        COALESCE(SUM(c.monthly_payment * 0.3), 0) as total_margin -- Estimate 30% margin
    FROM contracts c
    WHERE c.company_id = user_company_id
    GROUP BY 
        CASE 
            WHEN c.status = 'active' THEN 'realized'
            WHEN c.status = 'pending' OR c.status = 'draft' THEN 'pending'
            ELSE 'refused'
        END
    
    UNION ALL
    
    -- Add offers data for pending contracts
    SELECT 
        CASE 
            WHEN o.status = 'accepted' AND o.converted_to_contract = true THEN 'realized'
            WHEN o.status = 'pending' THEN 'pending'
            ELSE 'refused'
        END as status,
        COUNT(*)::INTEGER as count,
        COALESCE(SUM(o.amount), 0) as total_revenue,
        COALESCE(SUM(o.amount - COALESCE(o.commission, 0)), 0) as total_purchases,
        COALESCE(SUM(o.commission), 0) as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.converted_to_contract = false -- Don't double count with contracts
    GROUP BY 
        CASE 
            WHEN o.status = 'accepted' AND o.converted_to_contract = true THEN 'realized'
            WHEN o.status = 'pending' THEN 'pending'
            ELSE 'refused'
        END;
END;
$$;