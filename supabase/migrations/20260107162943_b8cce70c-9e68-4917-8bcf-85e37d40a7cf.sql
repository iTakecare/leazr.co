-- Supprimer d'abord l'ancienne fonction
DROP FUNCTION IF EXISTS get_monthly_financial_data(integer);

-- Recréer la fonction avec support des contrats en propre (self-leasing)
CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer DEFAULT NULL)
RETURNS TABLE(
    month_name text,
    month_number integer,
    year integer,
    revenue numeric,
    purchases numeric,
    margin numeric,
    margin_percentage numeric,
    contracts_count bigint,
    offers_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_company_id uuid;
    target_year integer;
BEGIN
    -- Récupérer l'ID de l'entreprise de l'utilisateur
    SELECT company_id INTO user_company_id 
    FROM profiles 
    WHERE id = auth.uid();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Utiliser l'année spécifiée ou l'année courante
    target_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
    
    RETURN QUERY
    WITH months AS (
        SELECT 
            generate_series(1, 12) AS month_num,
            CASE generate_series(1, 12)
                WHEN 1 THEN 'Janvier'
                WHEN 2 THEN 'Février'
                WHEN 3 THEN 'Mars'
                WHEN 4 THEN 'Avril'
                WHEN 5 THEN 'Mai'
                WHEN 6 THEN 'Juin'
                WHEN 7 THEN 'Juillet'
                WHEN 8 THEN 'Août'
                WHEN 9 THEN 'Septembre'
                WHEN 10 THEN 'Octobre'
                WHEN 11 THEN 'Novembre'
                WHEN 12 THEN 'Décembre'
            END AS name
    ),
    -- Revenus et achats issus des factures
    invoice_data AS (
        SELECT 
            EXTRACT(MONTH FROM i.invoice_date)::integer AS inv_month_num,
            SUM(i.amount) AS total_revenue,
            SUM(
                CASE 
                    WHEN i.contract_id IS NOT NULL THEN 
                        COALESCE((SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = i.contract_id), 0)
                    WHEN i.offer_id IS NOT NULL THEN 
                        COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = i.offer_id), 0)
                    ELSE 0
                END
            ) AS total_purchases
        FROM invoices i
        WHERE i.company_id = user_company_id
            AND EXTRACT(YEAR FROM i.invoice_date) = target_year
        GROUP BY EXTRACT(MONTH FROM i.invoice_date)::integer
    ),
    -- Revenus récurrents des contrats en propre (self-leasing)
    self_leasing_monthly AS (
        SELECT 
            m.month_num AS sl_month_num,
            COALESCE(SUM(c.monthly_payment), 0) AS self_leasing_revenue,
            -- Achats seulement au 1er mois du contrat (mois de début)
            COALESCE(SUM(
                CASE 
                    WHEN EXTRACT(MONTH FROM c.contract_start_date) = m.month_num 
                         AND EXTRACT(YEAR FROM c.contract_start_date) = target_year 
                    THEN (
                        SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0)
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = c.id
                    )
                    ELSE 0 
                END
            ), 0) AS self_leasing_purchases
        FROM (SELECT generate_series(1, 12) AS month_num) m
        LEFT JOIN contracts c ON c.company_id = user_company_id
            AND c.is_self_leasing = true
            AND c.status IN ('signed', 'active', 'delivered')
            -- Le contrat est actif pendant ce mois
            AND c.contract_start_date <= make_date(target_year, m.month_num, 
                CASE 
                    WHEN m.month_num IN (4,6,9,11) THEN 30 
                    WHEN m.month_num = 2 THEN 
                        CASE WHEN target_year % 4 = 0 AND (target_year % 100 != 0 OR target_year % 400 = 0) THEN 29 ELSE 28 END
                    ELSE 31 
                END)
            AND (c.contract_end_date IS NULL OR c.contract_end_date >= make_date(target_year, m.month_num, 1))
        GROUP BY m.month_num
    ),
    -- Comptage des contrats
    contract_counts AS (
        SELECT 
            EXTRACT(MONTH FROM c.contract_start_date)::integer AS cc_month_num,
            COUNT(*) AS count
        FROM contracts c
        WHERE c.company_id = user_company_id
            AND EXTRACT(YEAR FROM c.contract_start_date) = target_year
        GROUP BY EXTRACT(MONTH FROM c.contract_start_date)::integer
    ),
    -- Comptage des offres
    offer_counts AS (
        SELECT 
            EXTRACT(MONTH FROM o.created_at)::integer AS oc_month_num,
            COUNT(*) AS count
        FROM offers o
        WHERE o.company_id = user_company_id
            AND EXTRACT(YEAR FROM o.created_at) = target_year
        GROUP BY EXTRACT(MONTH FROM o.created_at)::integer
    )
    SELECT 
        m.name::text AS month_name,
        m.month_num::integer AS month_number,
        target_year::integer AS year,
        (COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0))::numeric AS revenue,
        (COALESCE(id.total_purchases, 0) + COALESCE(sl.self_leasing_purchases, 0))::numeric AS purchases,
        (COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0) - COALESCE(id.total_purchases, 0) - COALESCE(sl.self_leasing_purchases, 0))::numeric AS margin,
        CASE 
            WHEN (COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0)) > 0 
            THEN ROUND(
                ((COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0) - COALESCE(id.total_purchases, 0) - COALESCE(sl.self_leasing_purchases, 0)) 
                / (COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0))) * 100, 
                2
            )::numeric
            ELSE 0::numeric
        END AS margin_percentage,
        COALESCE(cc.count, 0)::bigint AS contracts_count,
        COALESCE(oc.count, 0)::bigint AS offers_count
    FROM months m
    LEFT JOIN invoice_data id ON id.inv_month_num = m.month_num
    LEFT JOIN self_leasing_monthly sl ON sl.sl_month_num = m.month_num
    LEFT JOIN contract_counts cc ON cc.cc_month_num = m.month_num
    LEFT JOIN offer_counts oc ON oc.oc_month_num = m.month_num
    ORDER BY m.month_num;
END;
$$;