-- D'abord supprimer la fonction existante
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Puis recréer avec la nouvelle logique de marge en euros
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer)
RETURNS TABLE(
  status text,
  count bigint,
  total_revenue numeric,
  total_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_company_id UUID;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    
    -- Section PENDING : offres en attente (marge en euros)
    SELECT 
        'pending'::text as status,
        COUNT(DISTINCT o.id)::bigint as count,
        COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
        -- Marge en euros = montant financé effectif - prix d'achat
        COALESCE(SUM(
            CASE 
                -- Si pas d'équipements avec prix d'achat, utiliser le montant financé comme marge
                WHEN COALESCE(eq.eq_purchase, 0) = 0 THEN COALESCE(o.financed_amount, o.amount, 0)
                ELSE 
                    -- Calcul du montant financé effectif selon la logique frontend
                    CASE 
                        -- Si coefficient > 0 et mensualité > 0 : formule inverse Grenke
                        WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(eq.eq_monthly, 0) > 0 
                        THEN (eq.eq_monthly * 100.0 / o.coefficient) - eq.eq_purchase
                        -- Sinon si selling_price > 0 : utiliser selling_price
                        WHEN COALESCE(eq.eq_selling, 0) > 0 
                        THEN eq.eq_selling - eq.eq_purchase
                        -- Sinon fallback sur financed_amount ou amount
                        ELSE COALESCE(o.financed_amount, o.amount, 0) - eq.eq_purchase
                    END
            END
        ), 0)::numeric as total_margin
    FROM offers o
    LEFT JOIN LATERAL (
        SELECT 
            SUM(oe.purchase_price * oe.quantity) as eq_purchase,
            SUM(COALESCE(oe.monthly_payment, 0) * oe.quantity) as eq_monthly,
            SUM(COALESCE(oe.selling_price, 0) * oe.quantity) as eq_selling
        FROM offer_equipment oe
        WHERE oe.offer_id = o.id
    ) eq ON true
    WHERE o.company_id = user_company_id
        AND o.status = 'pending'
        AND o.converted_to_contract = false
        AND (p_year IS NULL OR EXTRACT(year FROM o.created_at) = p_year)
    
    UNION ALL
    
    -- Section REFUSED : offres refusées (marge en euros perdue)
    SELECT 
        'refused'::text as status,
        COUNT(DISTINCT o.id)::bigint as count,
        COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
        -- Marge en euros = montant financé effectif - prix d'achat
        COALESCE(SUM(
            CASE 
                -- Si pas d'équipements avec prix d'achat, utiliser le montant financé comme marge
                WHEN COALESCE(eq.eq_purchase, 0) = 0 THEN COALESCE(o.financed_amount, o.amount, 0)
                ELSE 
                    -- Calcul du montant financé effectif selon la logique frontend
                    CASE 
                        -- Si coefficient > 0 et mensualité > 0 : formule inverse Grenke
                        WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(eq.eq_monthly, 0) > 0 
                        THEN (eq.eq_monthly * 100.0 / o.coefficient) - eq.eq_purchase
                        -- Sinon si selling_price > 0 : utiliser selling_price
                        WHEN COALESCE(eq.eq_selling, 0) > 0 
                        THEN eq.eq_selling - eq.eq_purchase
                        -- Sinon fallback sur financed_amount ou amount
                        ELSE COALESCE(o.financed_amount, o.amount, 0) - eq.eq_purchase
                    END
            END
        ), 0)::numeric as total_margin
    FROM offers o
    LEFT JOIN LATERAL (
        SELECT 
            SUM(oe.purchase_price * oe.quantity) as eq_purchase,
            SUM(COALESCE(oe.monthly_payment, 0) * oe.quantity) as eq_monthly,
            SUM(COALESCE(oe.selling_price, 0) * oe.quantity) as eq_selling
        FROM offer_equipment oe
        WHERE oe.offer_id = o.id
    ) eq ON true
    WHERE o.company_id = user_company_id
        AND o.status = 'refused'
        AND (p_year IS NULL OR EXTRACT(year FROM o.created_at) = p_year)
    
    UNION ALL
    
    -- Section REALIZED : CA réalisé basé sur les factures leasing
    SELECT 
        'realized'::text as status,
        COUNT(DISTINCT i.id)::bigint as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                WHEN i.contract_id IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM((ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity) - (ce.purchase_price * ce.quantity))
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = i.contract_id
                    ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
                ELSE 0
            END
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.invoice_type = 'leasing'
        AND i.status IN ('paid', 'sent', 'pending')
        AND (p_year IS NULL OR EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = p_year)
    
    UNION ALL
    
    -- Section DIRECT_SALES : Ventes directes basées sur les factures purchase
    SELECT 
        'direct_sales'::text as status,
        COUNT(DISTINCT i.id)::bigint as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                ELSE
                    COALESCE((
                        SELECT SUM(
                            ((eq->>'purchase_price')::numeric * (1 + COALESCE((eq->>'margin')::numeric, 0) / 100) * COALESCE((eq->>'quantity')::numeric, 1)) -
                            ((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
                        )
                        FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
                    ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
            END
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.invoice_type = 'purchase'
        AND i.status IN ('paid', 'sent', 'pending')
        AND (p_year IS NULL OR EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = p_year)
    
    UNION ALL
    
    -- Section FORECAST : CA prévisionnel basé sur les contrats actifs
    SELECT 
        'forecast'::text as status,
        COUNT(DISTINCT c.id)::bigint as count,
        COALESCE(SUM(
            COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
        ), 0)::numeric as total_revenue,
        COALESCE(SUM(
            COALESCE((
                SELECT SUM((ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity) - (ce.purchase_price * ce.quantity))
                FROM contract_equipment ce 
                WHERE ce.contract_id = c.id
            ), 0)
        ), 0)::numeric as total_margin
    FROM contracts c
    WHERE c.company_id = user_company_id
        AND c.status IN ('active', 'contract_sent')
        AND (p_year IS NULL OR EXTRACT(year FROM c.created_at) = p_year);
END;
$function$;