-- Drop existing function first (signature changed)
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Recreate with correct logic for total_margin (Potentiel) using equipment like frontend
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL::integer)
 RETURNS TABLE(status text, count bigint, total_revenue numeric, total_margin numeric)
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
    
    -- PENDING: Offers in progress (not converted, not accepted/invoiced/rejected)
    SELECT 
        'pending'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
        COALESCE(SUM(
            CASE 
                WHEN o.is_purchase = true THEN 0
                WHEN eq.eq_monthly > 0 THEN eq.eq_monthly
                ELSE COALESCE(o.monthly_payment, 0)
            END
        ), 0)::numeric as total_margin
    FROM offers o
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(oe.monthly_payment), 0) as eq_monthly
        FROM offer_equipment oe
        WHERE oe.offer_id = o.id
    ) eq ON true
    WHERE o.company_id = user_company_id
      AND o.converted_to_contract = false
      AND LOWER(COALESCE(o.workflow_status, '')) NOT IN (
          'accepted', 'validated', 'financed', 'contract_sent', 'signed',
          'invoicing',
          'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
      )
    
    UNION ALL
    
    -- REALIZED: Leasing invoices for the year
    SELECT 
        'realized'::text as status,
        COUNT(DISTINCT i.id)::bigint as count,
        COALESCE(SUM(i.amount), 0)::numeric as total_revenue,
        COALESCE(SUM(
            CASE 
                WHEN i.contract_id IS NOT NULL THEN
                    (SELECT SUM(ce.purchase_price * (COALESCE(ce.margin, 0) / 100) * ce.quantity)
                     FROM contract_equipment ce WHERE ce.contract_id = i.contract_id)
                ELSE 0
            END
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'leasing'
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
    
    UNION ALL
    
    -- DIRECT_SALES: Purchase invoices for the year
    SELECT 
        'direct_sales'::text as status,
        COUNT(DISTINCT i.id)::bigint as count,
        COALESCE(SUM(i.amount), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(
                (eq->>'purchase_price')::numeric * 
                (COALESCE((eq->>'margin')::numeric, 0) / 100) * 
                COALESCE((eq->>'quantity')::numeric, 1)
            )
            FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
        ), 0)::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.invoice_type = 'purchase'
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
    
    UNION ALL
    
    -- REFUSED: Rejected offers for the year
    SELECT 
        'refused'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
        COALESCE(SUM(
            CASE 
                WHEN o.is_purchase = true THEN 0
                WHEN eq.eq_monthly > 0 THEN eq.eq_monthly
                ELSE COALESCE(o.monthly_payment, 0)
            END
        ), 0)::numeric as total_margin
    FROM offers o
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(oe.monthly_payment), 0) as eq_monthly
        FROM offer_equipment oe
        WHERE oe.offer_id = o.id
    ) eq ON true
    WHERE o.company_id = user_company_id
      AND LOWER(o.workflow_status) IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
      AND EXTRACT(YEAR FROM o.created_at) = target_year
    
    UNION ALL
    
    -- FORECAST: Active contracts ending in the year
    SELECT 
        'forecast'::text as status,
        COUNT(*)::bigint as count,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity)
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_revenue,
        COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0)::numeric as total_margin
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND c.status IN ('active', 'contract_sent')
      AND EXTRACT(YEAR FROM c.contract_end_date) = target_year;
END;
$function$;