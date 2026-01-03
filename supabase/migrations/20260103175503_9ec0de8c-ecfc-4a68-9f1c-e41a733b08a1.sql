
-- Supprimer l'ancienne fonction puis recréer avec la nouvelle logique de marge en euros
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_company_id UUID;
    result JSONB;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'pending', jsonb_build_object('count', 0, 'total_revenue', 0, 'total_margin', 0),
            'refused', jsonb_build_object('count', 0, 'total_revenue', 0, 'total_margin', 0),
            'realized', jsonb_build_object('count', 0, 'total_revenue', 0, 'total_margin', 0),
            'direct_sales', jsonb_build_object('count', 0, 'total_revenue', 0, 'total_margin', 0),
            'forecast', jsonb_build_object('count', 0, 'total_revenue', 0, 'total_margin', 0)
        );
    END IF;

    WITH 
    -- Calcul des équipements pour les offres pending/refused avec marge en euros
    offer_equipment_calc AS (
        SELECT 
            o.id as offer_id,
            o.status,
            o.is_purchase,
            o.amount,
            o.financed_amount,
            o.coefficient,
            o.monthly_payment as offer_monthly,
            -- Prix d'achat total des équipements
            COALESCE(SUM(oe.purchase_price * oe.quantity), 0) as eq_purchase,
            -- Mensualité totale des équipements
            COALESCE(SUM(oe.monthly_payment), 0) as eq_monthly,
            -- Prix de vente total des équipements (selling_price)
            COALESCE(SUM(oe.selling_price * oe.quantity), 0) as eq_selling,
            -- Montant financé effectif (logique frontend marginCalculations.ts)
            CASE 
                -- Si coefficient > 0 et mensualité équipement > 0 : inverse Grenke
                WHEN o.coefficient > 0 AND COALESCE(SUM(oe.monthly_payment), 0) > 0 
                    THEN ROUND((COALESCE(SUM(oe.monthly_payment), 0) * 100) / o.coefficient, 2)
                -- Sinon si selling_price > 0 : somme des selling_price
                WHEN COALESCE(SUM(oe.selling_price * oe.quantity), 0) > 0 
                    THEN COALESCE(SUM(oe.selling_price * oe.quantity), 0)
                -- Sinon fallback sur financed_amount ou amount
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END as financed_effective
        FROM offers o
        LEFT JOIN offer_equipment oe ON oe.offer_id = o.id
        WHERE o.company_id = user_company_id
          AND o.status IN ('pending', 'refused')
          AND o.converted_to_contract = false
        GROUP BY o.id, o.status, o.is_purchase, o.amount, o.financed_amount, o.coefficient, o.monthly_payment
    ),
    -- Statistiques pending avec marge en euros
    pending_stats AS (
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total_revenue,
            -- Marge € = montant financé effectif - prix d'achat
            COALESCE(SUM(
                CASE 
                    WHEN is_purchase = true THEN 0
                    WHEN eq_purchase > 0 THEN financed_effective - eq_purchase
                    ELSE 0
                END
            ), 0) as total_margin
        FROM offer_equipment_calc
        WHERE status = 'pending'
    ),
    -- Statistiques refused avec marge en euros
    refused_stats AS (
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total_revenue,
            -- Marge € = montant financé effectif - prix d'achat
            COALESCE(SUM(
                CASE 
                    WHEN is_purchase = true THEN 0
                    WHEN eq_purchase > 0 THEN financed_effective - eq_purchase
                    ELSE 0
                END
            ), 0) as total_margin
        FROM offer_equipment_calc
        WHERE status = 'refused'
    ),
    -- Contrats réalisés (actifs) - inchangé
    realized_stats AS (
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0) as total_revenue,
            COALESCE(SUM(
                (SELECT COALESCE(SUM(ce.purchase_price * (COALESCE(ce.margin, 0) / 100) * ce.quantity), 0)
                 FROM contract_equipment ce WHERE ce.contract_id = c.id)
            ), 0) as total_margin
        FROM contracts c
        WHERE c.company_id = user_company_id
          AND c.status IN ('active', 'contract_sent', 'signed')
    ),
    -- Ventes directes (achats comptant) - inchangé
    direct_sales_stats AS (
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(o.amount), 0) as total_revenue,
            COALESCE(SUM(
                (SELECT COALESCE(SUM(oe.purchase_price * (COALESCE(oe.margin, 0) / 100) * oe.quantity), 0)
                 FROM offer_equipment oe WHERE oe.offer_id = o.id)
            ), 0) as total_margin
        FROM offers o
        WHERE o.company_id = user_company_id
          AND o.is_purchase = true
          AND o.status = 'accepted'
    ),
    -- Prévisions (offres acceptées non encore converties) - inchangé
    forecast_stats AS (
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(o.monthly_payment * COALESCE(o.duration, 36)), 0) as total_revenue,
            COALESCE(SUM(
                (SELECT COALESCE(SUM(oe.purchase_price * (COALESCE(oe.margin, 0) / 100) * oe.quantity), 0)
                 FROM offer_equipment oe WHERE oe.offer_id = o.id)
            ), 0) as total_margin
        FROM offers o
        WHERE o.company_id = user_company_id
          AND o.status = 'accepted'
          AND o.converted_to_contract = false
          AND o.is_purchase = false
    )
    SELECT jsonb_build_object(
        'pending', jsonb_build_object(
            'count', COALESCE((SELECT count FROM pending_stats), 0),
            'total_revenue', COALESCE((SELECT total_revenue FROM pending_stats), 0),
            'total_margin', COALESCE((SELECT total_margin FROM pending_stats), 0)
        ),
        'refused', jsonb_build_object(
            'count', COALESCE((SELECT count FROM refused_stats), 0),
            'total_revenue', COALESCE((SELECT total_revenue FROM refused_stats), 0),
            'total_margin', COALESCE((SELECT total_margin FROM refused_stats), 0)
        ),
        'realized', jsonb_build_object(
            'count', COALESCE((SELECT count FROM realized_stats), 0),
            'total_revenue', COALESCE((SELECT total_revenue FROM realized_stats), 0),
            'total_margin', COALESCE((SELECT total_margin FROM realized_stats), 0)
        ),
        'direct_sales', jsonb_build_object(
            'count', COALESCE((SELECT count FROM direct_sales_stats), 0),
            'total_revenue', COALESCE((SELECT total_revenue FROM direct_sales_stats), 0),
            'total_margin', COALESCE((SELECT total_margin FROM direct_sales_stats), 0)
        ),
        'forecast', jsonb_build_object(
            'count', COALESCE((SELECT count FROM forecast_stats), 0),
            'total_revenue', COALESCE((SELECT total_revenue FROM forecast_stats), 0),
            'total_margin', COALESCE((SELECT total_margin FROM forecast_stats), 0)
        )
    ) INTO result;
    
    RETURN result;
END;
$function$;
