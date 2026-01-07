-- Corriger la fonction get_monthly_financial_data pour les contrats en propre
-- Résout l'erreur "set-returning functions are not allowed in CASE"
-- et répartit les achats sur la durée du contrat

DROP FUNCTION IF EXISTS get_monthly_financial_data(integer);

CREATE OR REPLACE FUNCTION get_monthly_financial_data(target_year integer)
RETURNS TABLE (
    month integer,
    revenue numeric,
    purchases numeric,
    margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    -- Récupérer l'ID de la company de l'utilisateur
    SELECT company_id INTO user_company_id
    FROM profiles
    WHERE id = auth.uid();

    IF user_company_id IS NULL THEN
        RAISE EXCEPTION 'User company not found';
    END IF;

    RETURN QUERY
    WITH months AS (
        SELECT generate_series(1, 12) AS month_num
    ),
    -- Données des factures existantes
    invoice_data AS (
        SELECT 
            EXTRACT(month FROM i.issue_date)::integer AS invoice_month,
            SUM(i.amount) AS total_revenue,
            SUM(COALESCE(i.purchase_amount, 0)) AS total_purchases
        FROM invoices i
        WHERE i.company_id = user_company_id
            AND EXTRACT(year FROM i.issue_date) = target_year
            AND i.status != 'cancelled'
        GROUP BY EXTRACT(month FROM i.issue_date)
    ),
    -- Pré-calculer les achats totaux par contrat en propre
    contract_purchases AS (
        SELECT 
            ce.contract_id,
            SUM(ce.purchase_price * ce.quantity) AS total_purchase
        FROM contract_equipment ce
        INNER JOIN contracts c ON c.id = ce.contract_id
        WHERE c.company_id = user_company_id
            AND c.is_self_leasing = true
        GROUP BY ce.contract_id
    ),
    -- Revenus récurrents des contrats en propre (self-leasing)
    self_leasing_monthly AS (
        SELECT 
            m.month_num AS sl_month_num,
            COALESCE(SUM(c.monthly_payment), 0) AS self_leasing_revenue,
            -- Achats répartis sur la durée du contrat (purchase / contract_duration)
            COALESCE(SUM(
                COALESCE(cp.total_purchase, 0) / NULLIF(c.contract_duration, 0)
            ), 0) AS self_leasing_purchases
        FROM months m
        LEFT JOIN contracts c ON c.company_id = user_company_id
            AND c.is_self_leasing = true
            AND c.status IN ('signed', 'active', 'delivered')
            -- Le contrat est actif pendant ce mois
            AND c.contract_start_date <= make_date(target_year, m.month_num, 
                CASE 
                    WHEN m.month_num IN (4, 6, 9, 11) THEN 30
                    WHEN m.month_num = 2 THEN 28
                    ELSE 31 
                END)
            AND (c.contract_end_date IS NULL OR c.contract_end_date >= make_date(target_year, m.month_num, 1))
        LEFT JOIN contract_purchases cp ON cp.contract_id = c.id
        GROUP BY m.month_num
    )
    SELECT 
        m.month_num AS month,
        COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0) AS revenue,
        COALESCE(id.total_purchases, 0) + COALESCE(sl.self_leasing_purchases, 0) AS purchases,
        (COALESCE(id.total_revenue, 0) + COALESCE(sl.self_leasing_revenue, 0)) - 
        (COALESCE(id.total_purchases, 0) + COALESCE(sl.self_leasing_purchases, 0)) AS margin
    FROM months m
    LEFT JOIN invoice_data id ON id.invoice_month = m.month_num
    LEFT JOIN self_leasing_monthly sl ON sl.sl_month_num = m.month_num
    ORDER BY m.month_num;
END;
$$;