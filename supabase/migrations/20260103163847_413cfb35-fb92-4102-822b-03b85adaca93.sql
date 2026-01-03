-- Modifier get_monthly_financial_data pour accepter un paramètre année
CREATE OR REPLACE FUNCTION public.get_monthly_financial_data(p_year INTEGER DEFAULT NULL)
 RETURNS TABLE(month_name text, month_number integer, year integer, revenue numeric, purchases numeric, margin numeric, margin_percentage numeric, contracts_count integer, offers_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_company_id UUID;
    target_year INTEGER := COALESCE(p_year, EXTRACT(year FROM now())::INTEGER);
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
            i.invoice_type,
            EXTRACT(month FROM COALESCE(i.invoice_date, i.created_at)) as month_num,
            -- Invoice amount is the revenue (CA) - MOINS les montants crédités
            COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0) as revenue,
            -- Achats : exclure ou proportionner si facture créditée
            CASE 
                -- Si la facture est entièrement créditée, pas d'achats comptés
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                -- Achats pour factures de LEASING (via contract_equipment)
                WHEN i.contract_id IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM(ce.purchase_price * ce.quantity)
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = i.contract_id
                    ), 0) * 
                    -- Proportionner si partiellement crédité
                    (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
                -- Achats pour factures d'ACHAT (via billing_data JSONB)
                ELSE
                    COALESCE((
                        SELECT SUM(
                            (eq->>'purchase_price')::numeric * 
                            COALESCE((eq->>'quantity')::numeric, 1)
                        )
                        FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
                    ), 0) * 
                    -- Proportionner si partiellement crédité
                    (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
            END as purchases
        FROM invoices i
        WHERE i.company_id = user_company_id 
            AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year
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
        target_year as year,
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
$function$;

-- Modifier get_contract_statistics_by_status pour accepter un paramètre année
-- et ne filtrer que les sections "realized", "direct_sales" et "refused" par année
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year INTEGER DEFAULT NULL)
 RETURNS TABLE(status text, count bigint, total_revenue numeric, total_purchases numeric, total_margin numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_company_id UUID;
    target_year INTEGER := COALESCE(p_year, EXTRACT(year FROM now())::INTEGER);
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Contrats réalisés (avec factures) - FILTRÉ PAR ANNÉE
    RETURN QUERY
    SELECT 
        'realized'::text as status,
        COUNT(DISTINCT i.contract_id)::bigint as count,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                WHEN i.contract_id IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM(ce.purchase_price * ce.quantity)
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = i.contract_id
                    ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
                ELSE 0
            END
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric - 
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                WHEN i.contract_id IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM(ce.purchase_price * ce.quantity)
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = i.contract_id
                    ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
                ELSE 0
            END
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.contract_id IS NOT NULL
        AND i.invoice_type = 'leasing'
        AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year;

    -- Ventes directes (factures sans contrat) - FILTRÉ PAR ANNÉE
    RETURN QUERY
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
                            (eq->>'purchase_price')::numeric * 
                            COALESCE((eq->>'quantity')::numeric, 1)
                        )
                        FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
                    ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
            END
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric - 
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
                ELSE
                    COALESCE((
                        SELECT SUM(
                            (eq->>'purchase_price')::numeric * 
                            COALESCE((eq->>'quantity')::numeric, 1)
                        )
                        FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
                    ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
            END
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
        AND i.contract_id IS NULL
        AND (i.invoice_type = 'purchase' OR i.invoice_type IS NULL)
        AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year;

    -- En attente (offres en cours) - SANS FILTRE ANNÉE (toujours les demandes en cours)
    RETURN QUERY
    SELECT 
        'pending'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(o.financed_amount), 0)::numeric as total_revenue,
        COALESCE(SUM(o.amount), 0)::numeric as total_purchases,
        COALESCE(SUM(o.financed_amount - o.amount), 0)::numeric as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.workflow_status NOT IN ('accepted', 'refused', 'expired', 'cancelled');

    -- Refusés/Sans suite - FILTRÉ PAR ANNÉE
    RETURN QUERY
    SELECT 
        'refused'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(o.financed_amount), 0)::numeric as total_revenue,
        COALESCE(SUM(o.amount), 0)::numeric as total_purchases,
        COALESCE(SUM(o.financed_amount - o.amount), 0)::numeric as total_margin
    FROM offers o
    WHERE o.company_id = user_company_id
        AND o.workflow_status IN ('refused', 'expired', 'cancelled')
        AND EXTRACT(year FROM COALESCE(o.updated_at, o.created_at)) = target_year;

    -- Prévisionnel (contrats signés mais pas encore facturés) - SANS FILTRE ANNÉE
    RETURN QUERY
    SELECT 
        'forecast'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_purchases,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric - 
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_margin
    FROM contracts c
    WHERE c.company_id = user_company_id
        AND c.status IN ('active', 'contract_sent')
        AND NOT EXISTS (
            SELECT 1 FROM invoices i 
            WHERE i.contract_id = c.id 
            AND i.invoice_type = 'leasing'
        );
END;
$function$;