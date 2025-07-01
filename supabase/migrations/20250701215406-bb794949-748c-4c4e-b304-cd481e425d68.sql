-- Corriger la fonction de calcul des métriques du dashboard
CREATE OR REPLACE FUNCTION get_company_dashboard_metrics(
    p_company_id UUID,
    time_filter TEXT DEFAULT 'month'
)
RETURNS TABLE (
    total_revenue NUMERIC,
    total_clients BIGINT,
    total_offers BIGINT,
    total_contracts BIGINT,
    pending_offers BIGINT,
    active_contracts BIGINT,
    monthly_growth_revenue NUMERIC,
    monthly_growth_clients NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    time_constraint TEXT;
    current_start DATE;
    previous_start DATE;
    previous_end DATE;
    current_revenue NUMERIC := 0;
    previous_revenue NUMERIC := 0;
    current_clients BIGINT := 0;
    previous_clients BIGINT := 0;
BEGIN
    -- Définir les contraintes de temps selon le filtre
    CASE time_filter
        WHEN 'month' THEN
            current_start := date_trunc('month', CURRENT_DATE);
            previous_start := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
            previous_end := date_trunc('month', CURRENT_DATE) - INTERVAL '1 day';
        WHEN 'quarter' THEN
            current_start := date_trunc('quarter', CURRENT_DATE);
            previous_start := date_trunc('quarter', CURRENT_DATE - INTERVAL '3 months');
            previous_end := date_trunc('quarter', CURRENT_DATE) - INTERVAL '1 day';
        WHEN 'year' THEN
            current_start := date_trunc('year', CURRENT_DATE);
            previous_start := date_trunc('year', CURRENT_DATE - INTERVAL '1 year');
            previous_end := date_trunc('year', CURRENT_DATE) - INTERVAL '1 day';
        ELSE
            current_start := '1900-01-01'::DATE;
            previous_start := '1900-01-01'::DATE;
            previous_end := '1900-01-01'::DATE;
    END CASE;

    -- Calculer le chiffre d'affaires actuel basé sur les offres acceptées (amount total)
    SELECT COALESCE(SUM(amount), 0)
    INTO current_revenue
    FROM offers o
    WHERE o.company_id = p_company_id
    AND o.status IN ('accepted', 'approved')
    AND o.workflow_status IN ('client_approved', 'leaser_approved', 'contract_sent')
    AND (time_filter = 'all' OR o.created_at >= current_start);

    -- Calculer le chiffre d'affaires de la période précédente
    IF time_filter != 'all' THEN
        SELECT COALESCE(SUM(amount), 0)
        INTO previous_revenue
        FROM offers o
        WHERE o.company_id = p_company_id
        AND o.status IN ('accepted', 'approved')
        AND o.workflow_status IN ('client_approved', 'leaser_approved', 'contract_sent')
        AND o.created_at >= previous_start
        AND o.created_at <= previous_end;
    END IF;

    -- Compter les clients actuels
    SELECT COUNT(*)
    INTO current_clients
    FROM clients cl
    WHERE cl.company_id = p_company_id
    AND (time_filter = 'all' OR cl.created_at >= current_start);

    -- Compter les clients de la période précédente
    IF time_filter != 'all' THEN
        SELECT COUNT(*)
        INTO previous_clients
        FROM clients cl
        WHERE cl.company_id = p_company_id
        AND cl.created_at >= previous_start
        AND cl.created_at <= previous_end;
    END IF;

    RETURN QUERY
    SELECT 
        current_revenue as total_revenue,
        (SELECT COUNT(*) FROM clients WHERE company_id = p_company_id) as total_clients,
        (SELECT COUNT(*) FROM offers WHERE company_id = p_company_id) as total_offers,
        (SELECT COUNT(*) FROM contracts WHERE company_id = p_company_id) as total_contracts,
        (SELECT COUNT(*) FROM offers WHERE company_id = p_company_id AND status = 'pending') as pending_offers,
        (SELECT COUNT(*) FROM contracts WHERE company_id = p_company_id AND status IN ('active', 'contract_sent', 'equipment_ordered')) as active_contracts,
        CASE 
            WHEN previous_revenue > 0 THEN 
                ((current_revenue - previous_revenue) / previous_revenue * 100)
            ELSE 0 
        END as monthly_growth_revenue,
        CASE 
            WHEN previous_clients > 0 THEN 
                ((current_clients - previous_clients)::NUMERIC / previous_clients * 100)
            ELSE 0 
        END as monthly_growth_clients;
END;
$$;