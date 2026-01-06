-- Supprimer les surcharges problématiques qui créent l'ambiguïté PGRST203
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer, uuid);
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Recréer la fonction avec une seule signature claire
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_revenue NUMERIC,
  total_purchases NUMERIC,
  total_margin NUMERIC
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
    WITH contract_data AS (
        SELECT 
            c.id,
            c.status as contract_status,
            c.workflow_status,
            c.type,
            c.monthly_payment,
            c.leasing_duration,
            COALESCE(
                (SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) 
                 FROM contract_equipment ce 
                 WHERE ce.contract_id = c.id),
                0
            ) as equipment_cost
        FROM contracts c
        WHERE c.company_id = user_company_id
          AND EXTRACT(year FROM c.created_at) = target_year
    ),
    -- Contrats réalisés (signés et actifs)
    realized AS (
        SELECT 
            'realized'::TEXT as status,
            COUNT(*)::BIGINT as count,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36)), 0)::NUMERIC as total_revenue,
            COALESCE(SUM(equipment_cost), 0)::NUMERIC as total_purchases,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36) - equipment_cost), 0)::NUMERIC as total_margin
        FROM contract_data
        WHERE contract_status = 'active' 
           OR workflow_status IN ('signed', 'delivered', 'active')
    ),
    -- Contrats en attente
    pending AS (
        SELECT 
            'pending'::TEXT as status,
            COUNT(*)::BIGINT as count,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36)), 0)::NUMERIC as total_revenue,
            COALESCE(SUM(equipment_cost), 0)::NUMERIC as total_purchases,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36) - equipment_cost), 0)::NUMERIC as total_margin
        FROM contract_data
        WHERE contract_status = 'pending' 
           OR workflow_status IN ('draft', 'pending', 'sent', 'client_signed')
    ),
    -- Contrats refusés
    refused AS (
        SELECT 
            'refused'::TEXT as status,
            COUNT(*)::BIGINT as count,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36)), 0)::NUMERIC as total_revenue,
            COALESCE(SUM(equipment_cost), 0)::NUMERIC as total_purchases,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36) - equipment_cost), 0)::NUMERIC as total_margin
        FROM contract_data
        WHERE contract_status = 'cancelled' 
           OR workflow_status IN ('rejected', 'cancelled')
    ),
    -- Ventes directes
    direct_sales AS (
        SELECT 
            'direct_sales'::TEXT as status,
            COUNT(*)::BIGINT as count,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36)), 0)::NUMERIC as total_revenue,
            COALESCE(SUM(equipment_cost), 0)::NUMERIC as total_purchases,
            COALESCE(SUM(monthly_payment * COALESCE(leasing_duration, 36) - equipment_cost), 0)::NUMERIC as total_margin
        FROM contract_data
        WHERE type = 'direct_sale'
    ),
    -- Prévisionnel (offres acceptées non encore converties)
    forecast AS (
        SELECT 
            'forecast'::TEXT as status,
            COUNT(*)::BIGINT as count,
            COALESCE(SUM(o.monthly_payment * 36), 0)::NUMERIC as total_revenue,
            COALESCE(SUM(o.amount), 0)::NUMERIC as total_purchases,
            COALESCE(SUM(o.monthly_payment * 36 - o.amount), 0)::NUMERIC as total_margin
        FROM offers o
        WHERE o.company_id = user_company_id
          AND EXTRACT(year FROM o.created_at) = target_year
          AND o.status = 'accepted'
          AND o.converted_to_contract = false
    )
    SELECT * FROM realized
    UNION ALL
    SELECT * FROM pending
    UNION ALL
    SELECT * FROM refused
    UNION ALL
    SELECT * FROM direct_sales
    UNION ALL
    SELECT * FROM forecast;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;