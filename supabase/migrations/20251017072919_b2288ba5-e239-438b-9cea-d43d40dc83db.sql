-- Fix dashboard calculations to use real equipment data

-- 1. Fix monthly financial data to include all signed contracts and calculate real margins
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
    contract_financials AS (
        SELECT 
            c.id as contract_id,
            EXTRACT(month FROM c.created_at) as month_num,
            COALESCE(SUM(ce.purchase_price * ce.quantity), 0) as total_purchase,
            COALESCE(
                SUM(
                    CASE 
                        WHEN ce.selling_price IS NOT NULL 
                        THEN ce.selling_price * ce.quantity
                        ELSE ce.purchase_price * ce.quantity * (1 + COALESCE(ce.margin, 0) / 100)
                    END
                ), 0
            ) as total_selling
        FROM contracts c
        LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
        WHERE c.company_id = user_company_id 
            AND c.status IN ('active', 'contract_sent')
            AND EXTRACT(year FROM c.created_at) = current_year
        GROUP BY c.id, EXTRACT(month FROM c.created_at)
    ),
    contract_data AS (
        SELECT 
            cf.month_num,
            COUNT(DISTINCT cf.contract_id) as contracts_count,
            SUM(cf.total_selling) as revenue_from_contracts,
            SUM(cf.total_purchase) as purchases_from_contracts
        FROM contract_financials cf
        GROUP BY cf.month_num
    ),
    offer_financials AS (
        SELECT 
            o.id as offer_id,
            EXTRACT(month FROM o.created_at) as month_num,
            COALESCE(SUM(oe.purchase_price * oe.quantity), 0) as total_purchase,
            COALESCE(
                SUM(
                    CASE 
                        WHEN oe.selling_price IS NOT NULL 
                        THEN oe.selling_price * oe.quantity
                        ELSE oe.purchase_price * oe.quantity * (1 + COALESCE(oe.margin, 0) / 100)
                    END
                ), 0
            ) as total_selling
        FROM offers o
        LEFT JOIN offer_equipment oe ON oe.offer_id = o.id
        WHERE o.company_id = user_company_id 
            AND o.status = 'accepted'
            AND o.converted_to_contract = false
            AND EXTRACT(year FROM o.created_at) = current_year
        GROUP BY o.id, EXTRACT(month FROM o.created_at)
    ),
    offer_data AS (
        SELECT 
            of.month_num,
            COUNT(DISTINCT of.offer_id) as offers_count,
            SUM(of.total_selling) as revenue_from_offers,
            SUM(of.total_purchase) as purchases_from_offers
        FROM offer_financials of
        GROUP BY of.month_num
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
        COALESCE(cd.contracts_count, 0)::INTEGER as contracts_count,
        COALESCE(od.offers_count, 0)::INTEGER as offers_count
    FROM months m
    LEFT JOIN contract_data cd ON m.month_num = cd.month_num
    LEFT JOIN offer_data od ON m.month_num = od.month_num
    ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. Fix contract statistics by status to use real equipment data
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status()
RETURNS TABLE(
    status TEXT,
    count INTEGER,
    total_revenue NUMERIC,
    total_purchases NUMERIC,
    total_margin NUMERIC
)
AS $$
DECLARE
    user_company_id UUID;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    -- Contracts réalisés (actifs + contrats envoyés)
    SELECT 
        'realized'::TEXT as status,
        COUNT(DISTINCT c.id)::INTEGER as count,
        COALESCE(SUM(
            (SELECT SUM(COALESCE(ce.selling_price, ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100)) * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0) as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0) as total_purchases,
        COALESCE(SUM(
            (SELECT SUM(
                (COALESCE(ce.selling_price, ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100)) - ce.purchase_price) * ce.quantity
             ) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0) as total_margin
    FROM contracts c
    WHERE c.company_id = user_company_id
        AND c.status IN ('active', 'contract_sent')
    
    UNION ALL
    
    -- Offres en attente (draft, approved, info requested)
    SELECT 
        'pending'::TEXT as status,
        COUNT(DISTINCT o.id)::INTEGER as count,
        COALESCE(SUM(
            (SELECT SUM(COALESCE(oe.selling_price, oe.purchase_price * (1 + COALESCE(oe.margin, 0) / 100)) * oe.quantity)
             FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0) as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(oe.purchase_price * oe.quantity)
             FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0) as total_purchases,
        COALESCE(SUM(
            (SELECT SUM(
                (COALESCE(oe.selling_price, oe.purchase_price * (1 + COALESCE(oe.margin, 0) / 100)) - oe.purchase_price) * oe.quantity
             ) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0) as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.status = 'pending'
        AND o.workflow_status IN ('draft', 'internal_approved', 'info_requested', 'client_approved', 'leaser_approved')
        AND o.converted_to_contract = false
    
    UNION ALL
    
    -- Offres refusées
    SELECT 
        'refused'::TEXT as status,
        COUNT(DISTINCT o.id)::INTEGER as count,
        COALESCE(SUM(
            (SELECT SUM(COALESCE(oe.selling_price, oe.purchase_price * (1 + COALESCE(oe.margin, 0) / 100)) * oe.quantity)
             FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0) as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(oe.purchase_price * oe.quantity)
             FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0) as total_purchases,
        COALESCE(SUM(
            (SELECT SUM(
                (COALESCE(oe.selling_price, oe.purchase_price * (1 + COALESCE(oe.margin, 0) / 100)) - oe.purchase_price) * oe.quantity
             ) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0) as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND (
            o.workflow_status IN ('internal_rejected', 'client_rejected', 'leaser_rejected')
            OR (o.status = 'rejected')
        )
        AND o.converted_to_contract = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 3. Fix company dashboard metrics to use real data
CREATE OR REPLACE FUNCTION public.get_company_dashboard_metrics()
RETURNS TABLE(
    total_clients bigint,
    total_offers bigint,
    total_contracts bigint,
    total_revenue numeric,
    pending_offers bigint,
    active_contracts bigint,
    recent_signups bigint
)
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id)::bigint,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id)::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id)::bigint,
        (SELECT COALESCE(SUM(
            (SELECT SUM(COALESCE(ce.selling_price, ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100)) * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0) FROM contracts c WHERE c.company_id = user_company_id AND c.status IN ('active', 'contract_sent'))::numeric,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id AND status = 'pending')::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id AND status IN ('active', 'contract_sent'))::bigint,
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id AND created_at >= now() - interval '30 days')::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';