-- Remplacer la fonction get_contract_statistics_by_status avec les bons statuts workflow
-- et ajouter la catégorie 'direct_sales' pour les factures d'achat

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status()
RETURNS TABLE(
    status text,
    count integer,
    total_revenue numeric,
    total_purchases numeric,
    total_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id UUID;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    -- RÉALISÉS = Contrats facturés (basé sur invoices de type leasing)
    SELECT 
        'realized'::TEXT as status,
        COUNT(DISTINCT i.contract_id)::INTEGER as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::NUMERIC as total_revenue,
        COALESCE((
            SELECT SUM(ce.purchase_price * ce.quantity)
            FROM contract_equipment ce
            JOIN contracts c ON ce.contract_id = c.id
            WHERE c.company_id = user_company_id 
              AND c.id IN (
                SELECT DISTINCT i2.contract_id 
                FROM invoices i2 
                WHERE i2.company_id = user_company_id 
                  AND i2.status NOT IN ('cancelled', 'draft')
                  AND i2.contract_id IS NOT NULL
              )
        ), 0)::NUMERIC as total_purchases,
        -- Marge = Revenue - Achats
        (COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0) - 
         COALESCE((
            SELECT SUM(ce.purchase_price * ce.quantity)
            FROM contract_equipment ce
            JOIN contracts c ON ce.contract_id = c.id
            WHERE c.company_id = user_company_id 
              AND c.id IN (
                SELECT DISTINCT i2.contract_id 
                FROM invoices i2 
                WHERE i2.company_id = user_company_id 
                  AND i2.status NOT IN ('cancelled', 'draft')
                  AND i2.contract_id IS NOT NULL
              )
        ), 0))::NUMERIC as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.status NOT IN ('cancelled', 'draft')
        AND i.contract_id IS NOT NULL
        AND (i.invoice_type IS NULL OR i.invoice_type = 'leasing')
    
    UNION ALL
    
    -- VENTES DIRECTES = Factures de type "purchase"
    SELECT 
        'direct_sales'::TEXT as status,
        COUNT(*)::INTEGER as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::NUMERIC as total_revenue,
        COALESCE(SUM(
            (SELECT SUM((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
             FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
        ), 0)::NUMERIC as total_purchases,
        -- Marge = Revenue - Achats
        (COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0) - 
         COALESCE(SUM(
            (SELECT SUM((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
             FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
        ), 0))::NUMERIC as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.invoice_type = 'purchase'
        AND i.status NOT IN ('cancelled', 'draft')
    
    UNION ALL
    
    -- EN ATTENTE = Offres non converties avec statuts intermédiaires
    SELECT 
        'pending'::TEXT as status,
        COUNT(DISTINCT o.id)::INTEGER as count,
        COALESCE(SUM(o.amount), 0)::NUMERIC as total_revenue,
        COALESCE((
            SELECT SUM(oe.purchase_price * oe.quantity)
            FROM offer_equipment oe
            WHERE oe.offer_id IN (
                SELECT o2.id FROM offers o2
                WHERE o2.company_id = user_company_id
                AND o2.converted_to_contract = false
                AND o2.workflow_status IN ('draft', 'sent', 'offer_send', 'pending', 'internal_approved', 'internal_docs_requested', 'info_requested', 'leaser_introduced', 'leaser_docs_requested', 'score_leaser', 'offer_accepted', 'leaser_review', 'internal_review')
            )
        ), 0)::NUMERIC as total_purchases,
        -- Marge estimée
        (COALESCE(SUM(o.amount), 0) - COALESCE((
            SELECT SUM(oe.purchase_price * oe.quantity)
            FROM offer_equipment oe
            WHERE oe.offer_id IN (
                SELECT o2.id FROM offers o2
                WHERE o2.company_id = user_company_id
                AND o2.converted_to_contract = false
                AND o2.workflow_status IN ('draft', 'sent', 'offer_send', 'pending', 'internal_approved', 'internal_docs_requested', 'info_requested', 'leaser_introduced', 'leaser_docs_requested', 'score_leaser', 'offer_accepted', 'leaser_review', 'internal_review')
            )
        ), 0))::NUMERIC as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.converted_to_contract = false
        AND o.workflow_status IN ('draft', 'sent', 'offer_send', 'pending', 'internal_approved', 'internal_docs_requested', 'info_requested', 'leaser_introduced', 'leaser_docs_requested', 'score_leaser', 'offer_accepted', 'leaser_review', 'internal_review')
    
    UNION ALL
    
    -- REFUSÉS = Offres rejetées
    SELECT 
        'refused'::TEXT as status,
        COUNT(DISTINCT o.id)::INTEGER as count,
        COALESCE(SUM(o.amount), 0)::NUMERIC as total_revenue,
        COALESCE((
            SELECT SUM(oe.purchase_price * oe.quantity)
            FROM offer_equipment oe
            WHERE oe.offer_id IN (
                SELECT o2.id FROM offers o2
                WHERE o2.company_id = user_company_id
                AND o2.workflow_status IN ('internal_rejected', 'leaser_rejected', 'client_rejected', 'rejected')
            )
        ), 0)::NUMERIC as total_purchases,
        0::NUMERIC as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'client_rejected', 'rejected');
END;
$$;