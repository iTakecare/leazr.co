-- Fix get_contract_statistics_by_status function with correct column names
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer)
RETURNS TABLE(status text, count bigint, total_revenue numeric, total_purchases numeric, total_margin numeric)
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
    
    -- REALIZED: Contrats avec factures payées/émises dans l'année
    SELECT 
        'realized'::text as status,
        COUNT(DISTINCT c.id)::bigint as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)) - SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_margin
    FROM contracts c
    JOIN invoices i ON i.contract_id = c.id
    WHERE c.company_id = user_company_id
        AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = p_year
    
    UNION ALL
    
    -- DIRECT SALES: Ventes directes (factures sans contrat)
    SELECT 
        'direct_sales'::text as status,
        COUNT(DISTINCT i.id)::bigint as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
             FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)) - SUM(
            (SELECT SUM((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
             FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.contract_id IS NULL
        AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = p_year
    
    UNION ALL
    
    -- FORECAST: Contrats signés sans facture encore
    SELECT 
        'forecast'::text as status,
        COUNT(DISTINCT c.id)::bigint as count,
        COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)) - SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_margin
    FROM contracts c
    WHERE c.company_id = user_company_id
        AND c.status IN ('active', 'contract_sent')
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id)
        AND EXTRACT(YEAR FROM COALESCE(c.contract_signed_at, c.created_at)) = p_year
    
    UNION ALL
    
    -- PENDING: Demandes en cours (stock actuel, pas de filtre année)
    SELECT 
        'pending'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(
                    (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                    o.monthly_payment, 0
                ) > 0 THEN
                    (COALESCE(
                        (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                        o.monthly_payment, 0
                    ) * 100) / o.coefficient
                WHEN COALESCE(
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), 0
                ) > 0 THEN
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END
        ), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(
                    (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                    o.monthly_payment, 0
                ) > 0 THEN
                    (COALESCE(
                        (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                        o.monthly_payment, 0
                    ) * 100) / o.coefficient
                WHEN COALESCE(
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), 0
                ) > 0 THEN
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END
            - COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), 0)
        ), 0)::numeric as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.converted_to_contract = false
        AND o.workflow_status NOT IN (
            'accepted', 'validated', 'financed', 'contract_sent', 'contract_signed', 
            'invoicing', 'completed', 'internal_rejected', 'leaser_rejected', 
            'rejected', 'client_rejected', 'cancelled'
        )
    
    UNION ALL
    
    -- REFUSED: Demandes refusées (filtrées par année)
    SELECT 
        'refused'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(
                    (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                    o.monthly_payment, 0
                ) > 0 THEN
                    (COALESCE(
                        (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                        o.monthly_payment, 0
                    ) * 100) / o.coefficient
                WHEN COALESCE(
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), 0
                ) > 0 THEN
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END
        ), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(
                    (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                    o.monthly_payment, 0
                ) > 0 THEN
                    (COALESCE(
                        (SELECT SUM(oe.monthly_payment * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
                        o.monthly_payment, 0
                    ) * 100) / o.coefficient
                WHEN COALESCE(
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), 0
                ) > 0 THEN
                    (SELECT SUM(oe.selling_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END
            - COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), 0)
        ), 0)::numeric as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
        AND EXTRACT(YEAR FROM o.created_at) = p_year;
END;
$$;