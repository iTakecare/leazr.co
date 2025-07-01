-- Créer les fonctions RPC pour le dashboard multi-tenant

-- Fonction pour obtenir les métriques du dashboard d'une entreprise
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

    -- Calculer le chiffre d'affaires actuel (somme des monthly_payment des contrats)
    SELECT COALESCE(SUM(monthly_payment), 0)
    INTO current_revenue
    FROM contracts c
    WHERE c.company_id = p_company_id
    AND (time_filter = 'all' OR c.created_at >= current_start);

    -- Calculer le chiffre d'affaires de la période précédente
    IF time_filter != 'all' THEN
        SELECT COALESCE(SUM(monthly_payment), 0)
        INTO previous_revenue
        FROM contracts c
        WHERE c.company_id = p_company_id
        AND c.created_at >= previous_start
        AND c.created_at <= previous_end;
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
        (SELECT COUNT(*) FROM contracts WHERE company_id = p_company_id AND status IN ('active', 'contract_sent')) as active_contracts,
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

-- Fonction pour obtenir l'activité récente d'une entreprise
CREATE OR REPLACE FUNCTION get_company_recent_activity(
    p_company_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    activity_type TEXT,
    activity_description TEXT,
    entity_id UUID,
    entity_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    user_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH activity_data AS (
        -- Nouvelles offres
        SELECT 
            'offer'::TEXT as activity_type,
            'Nouvelle offre créée'::TEXT as activity_description,
            o.id as entity_id,
            o.client_name as entity_name,
            o.created_at,
            COALESCE(p.first_name || ' ' || p.last_name, 'Utilisateur inconnu') as user_name
        FROM offers o
        LEFT JOIN profiles p ON p.id = o.user_id
        WHERE o.company_id = p_company_id
        
        UNION ALL
        
        -- Nouveaux contrats
        SELECT 
            'contract'::TEXT as activity_type,
            'Nouveau contrat signé'::TEXT as activity_description,
            c.id as entity_id,
            c.client_name as entity_name,
            c.created_at,
            COALESCE(p.first_name || ' ' || p.last_name, 'Utilisateur inconnu') as user_name
        FROM contracts c
        LEFT JOIN profiles p ON p.id = c.user_id
        WHERE c.company_id = p_company_id
        
        UNION ALL
        
        -- Nouveaux clients
        SELECT 
            'client'::TEXT as activity_type,
            'Nouveau client ajouté'::TEXT as activity_description,
            cl.id as entity_id,
            cl.name as entity_name,
            cl.created_at,
            COALESCE(p.first_name || ' ' || p.last_name, 'Utilisateur inconnu') as user_name
        FROM clients cl
        LEFT JOIN profiles p ON p.id = cl.user_id
        WHERE cl.company_id = p_company_id
    )
    SELECT 
        ad.activity_type,
        ad.activity_description,
        ad.entity_id,
        ad.entity_name,
        ad.created_at,
        ad.user_name
    FROM activity_data ad
    ORDER BY ad.created_at DESC
    LIMIT p_limit;
END;
$$;