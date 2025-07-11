-- Correction des 2 derniers warnings "Function Search Path Mutable" du Security Advisor
-- Ajouter SET search_path = 'public' aux fonctions manquantes

-- 1. get_company_dashboard_metrics (SECURITY DEFINER - Critique)
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
        (SELECT COALESCE(SUM(monthly_payment), 0) FROM contracts WHERE company_id = user_company_id)::numeric,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id AND status = 'pending')::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id AND status = 'active')::bigint,
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id AND created_at >= now() - interval '30 days')::bigint;
END;
$$;

-- 2. get_company_recent_activity (SECURITY DEFINER - Critique)
CREATE OR REPLACE FUNCTION public.get_company_recent_activity()
RETURNS TABLE(
    activity_type text,
    activity_description text,
    created_at timestamp with time zone,
    entity_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    (
        SELECT 
            'client'::text as activity_type,
            'Nouveau client: ' || c.name as activity_description,
            c.created_at,
            c.id as entity_id
        FROM clients c
        WHERE c.company_id = user_company_id
        ORDER BY c.created_at DESC
        LIMIT 5
    )
    UNION ALL
    (
        SELECT 
            'offer'::text as activity_type,
            'Nouvelle offre créée' as activity_description,
            o.created_at,
            o.id as entity_id
        FROM offers o
        WHERE o.company_id = user_company_id
        ORDER BY o.created_at DESC
        LIMIT 5
    )
    UNION ALL
    (
        SELECT 
            'contract'::text as activity_type,
            'Nouveau contrat: ' || ct.client_name as activity_description,
            ct.created_at,
            ct.id as entity_id
        FROM contracts ct
        WHERE ct.company_id = user_company_id
        ORDER BY ct.created_at DESC
        LIMIT 5
    )
    ORDER BY created_at DESC
    LIMIT 10;
END;
$$;