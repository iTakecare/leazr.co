-- Drop existing function to change return signature
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Recreate with corrected logic
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer)
RETURNS TABLE(status text, count bigint, total_revenue numeric, total_purchases numeric, total_margin numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_company_id UUID;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    -- REALIZED: Contracts with at least one invoice
    RETURN QUERY
    SELECT 
        'realized'::text as status,
        COUNT(DISTINCT c.id)::bigint,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_purchases,
        (COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0) - 
         COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
         ), 0))::numeric as total_margin
    FROM contracts c
    INNER JOIN invoices i ON i.contract_id = c.id
    WHERE c.company_id = user_company_id
      AND EXTRACT(YEAR FROM i.invoice_date) = p_year;

    -- DIRECT_SALES: Direct sale invoices (no contract)
    RETURN QUERY
    SELECT 
        'direct_sales'::text as status,
        COUNT(DISTINCT i.id)::bigint,
        COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
             FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
        ), 0)::numeric as total_purchases,
        (COALESCE(SUM(i.amount - COALESCE(i.credited_amount, 0)), 0) - 
         COALESCE(SUM(
            (SELECT SUM((eq->>'purchase_price')::numeric * COALESCE((eq->>'quantity')::numeric, 1))
             FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq)
         ), 0))::numeric as total_margin
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.contract_id IS NULL
      AND i.invoice_type = 'direct_sale'
      AND EXTRACT(YEAR FROM i.invoice_date) = p_year;

    -- FORECAST: Contracts without invoices yet (filtered by year)
    RETURN QUERY
    SELECT 
        'forecast'::text as status,
        COUNT(DISTINCT c.id)::bigint,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity) 
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_revenue,
        COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0)::numeric as total_purchases,
        (COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity) 
             FROM contract_equipment ce WHERE ce.contract_id = c.id)
        ), 0) - 
         COALESCE(SUM(
            (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id)
         ), 0))::numeric as total_margin
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND c.status IN ('active', 'contract_sent')
      AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id)
      AND EXTRACT(YEAR FROM c.created_at) = p_year;

    -- PENDING: All current "in_progress" offers (NO YEAR FILTER - current stock)
    -- Logic matches useOfferFilters.ts: NOT in accepted/validated/financed/contract_sent/signed/invoicing/rejected statuses
    RETURN QUERY
    WITH offer_equipment_agg AS (
        SELECT 
            oe.offer_id,
            COALESCE(SUM(oe.purchase_price * oe.quantity), 0) as eq_purchase,
            COALESCE(SUM(oe.monthly_payment * oe.quantity), 0) as eq_monthly,
            COALESCE(SUM(oe.selling_price * oe.quantity), 0) as eq_selling
        FROM offer_equipment oe
        GROUP BY oe.offer_id
    ),
    pending_offers AS (
        SELECT 
            o.id,
            o.coefficient,
            o.financed_amount,
            o.amount,
            COALESCE(oea.eq_purchase, 0) as eq_purchase,
            COALESCE(oea.eq_monthly, 0) as eq_monthly,
            COALESCE(oea.eq_selling, 0) as eq_selling,
            -- Calculate financed_effective using frontend logic
            CASE 
                WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(oea.eq_monthly, 0) > 0 
                THEN (COALESCE(oea.eq_monthly, 0) * 100 / o.coefficient)
                WHEN COALESCE(oea.eq_selling, 0) > 0 
                THEN COALESCE(oea.eq_selling, 0)
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END as financed_effective
        FROM offers o
        LEFT JOIN offer_equipment_agg oea ON oea.offer_id = o.id
        WHERE o.company_id = user_company_id
          AND o.converted_to_contract = false
          AND LOWER(COALESCE(o.workflow_status, '')) NOT IN (
              'accepted', 'validated', 'financed', 'contract_sent', 'signed',
              'invoicing',
              'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
          )
    )
    SELECT 
        'pending'::text as status,
        COUNT(*)::bigint,
        0::numeric as total_revenue,
        COALESCE(SUM(eq_purchase), 0)::numeric as total_purchases,
        -- Margin in euros
        COALESCE(SUM(
            CASE 
                WHEN eq_purchase = 0 THEN COALESCE(financed_effective, 0)
                ELSE financed_effective - eq_purchase
            END
        ), 0)::numeric as total_margin
    FROM pending_offers;

    -- REFUSED: Rejected offers (WITH YEAR FILTER on created_at)
    RETURN QUERY
    WITH offer_equipment_agg AS (
        SELECT 
            oe.offer_id,
            COALESCE(SUM(oe.purchase_price * oe.quantity), 0) as eq_purchase,
            COALESCE(SUM(oe.monthly_payment * oe.quantity), 0) as eq_monthly,
            COALESCE(SUM(oe.selling_price * oe.quantity), 0) as eq_selling
        FROM offer_equipment oe
        GROUP BY oe.offer_id
    ),
    refused_offers AS (
        SELECT 
            o.id,
            o.coefficient,
            o.financed_amount,
            o.amount,
            COALESCE(oea.eq_purchase, 0) as eq_purchase,
            COALESCE(oea.eq_monthly, 0) as eq_monthly,
            COALESCE(oea.eq_selling, 0) as eq_selling,
            CASE 
                WHEN COALESCE(o.coefficient, 0) > 0 AND COALESCE(oea.eq_monthly, 0) > 0 
                THEN (COALESCE(oea.eq_monthly, 0) * 100 / o.coefficient)
                WHEN COALESCE(oea.eq_selling, 0) > 0 
                THEN COALESCE(oea.eq_selling, 0)
                ELSE COALESCE(o.financed_amount, o.amount, 0)
            END as financed_effective
        FROM offers o
        LEFT JOIN offer_equipment_agg oea ON oea.offer_id = o.id
        WHERE o.company_id = user_company_id
          AND LOWER(COALESCE(o.workflow_status, '')) IN (
              'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
          )
          AND EXTRACT(YEAR FROM o.created_at) = p_year
    )
    SELECT 
        'refused'::text as status,
        COUNT(*)::bigint,
        0::numeric as total_revenue,
        COALESCE(SUM(eq_purchase), 0)::numeric as total_purchases,
        COALESCE(SUM(
            CASE 
                WHEN eq_purchase = 0 THEN COALESCE(financed_effective, 0)
                ELSE financed_effective - eq_purchase
            END
        ), 0)::numeric as total_margin
    FROM refused_offers;
END;
$$;