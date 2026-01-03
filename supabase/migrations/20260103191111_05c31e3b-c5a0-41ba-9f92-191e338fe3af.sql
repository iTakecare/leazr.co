-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

-- Create the corrected function with validated logic
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE(
  status text,
  count bigint,
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
  target_year INTEGER := COALESCE(p_year, EXTRACT(year FROM now())::INTEGER);
BEGIN
  -- Get user's company_id
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  -- PENDING: Current stock of pending offers (no year filter)
  RETURN QUERY
  WITH pending_offers AS (
    SELECT 
      o.id,
      COALESCE(o.financed_amount, o.amount, 0) as ca,
      COALESCE((
        SELECT SUM(eq.purchase_price * COALESCE(eq.quantity, 1))
        FROM offer_equipment eq
        WHERE eq.offer_id = o.id
      ), 0) as achats
    FROM offers o
    WHERE o.company_id = user_company_id
      AND o.converted_to_contract = false
      AND (o.workflow_status IS NULL OR o.workflow_status NOT IN (
        'accepted', 'validated', 'financed', 'contract_sent', 'signed', 'invoicing',
        'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
      ))
  )
  SELECT 
    'pending'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(ca), 0)::numeric as total_revenue,
    COALESCE(SUM(achats), 0)::numeric as total_purchases,
    COALESCE(SUM(ca - achats), 0)::numeric as total_margin
  FROM pending_offers;

  -- REFUSED: Rejected offers (filtered by year)
  RETURN QUERY
  WITH refused_offers AS (
    SELECT 
      o.id,
      COALESCE(o.financed_amount, o.amount, 0) as ca,
      COALESCE((
        SELECT SUM(eq.purchase_price * COALESCE(eq.quantity, 1))
        FROM offer_equipment eq
        WHERE eq.offer_id = o.id
      ), 0) as achats
    FROM offers o
    WHERE o.company_id = user_company_id
      AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
      AND EXTRACT(YEAR FROM o.created_at) = target_year
  )
  SELECT 
    'refused'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(ca), 0)::numeric as total_revenue,
    COALESCE(SUM(achats), 0)::numeric as total_purchases,
    COALESCE(SUM(ca - achats), 0)::numeric as total_margin
  FROM refused_offers;

  -- REALIZED: Contracts with invoices (filtered by year based on invoice_date)
  RETURN QUERY
  WITH realized_data AS (
    SELECT 
      i.id as invoice_id,
      i.contract_id,
      COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0) as revenue,
      CASE 
        WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
        ELSE COALESCE((
          SELECT SUM(ce.purchase_price * ce.quantity)
          FROM contract_equipment ce 
          WHERE ce.contract_id = i.contract_id
        ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
      END as purchases
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND i.contract_id IS NOT NULL
      AND i.invoice_type != 'direct_sale'
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
  )
  SELECT 
    'realized'::text as status,
    COUNT(DISTINCT contract_id)::bigint as count,
    COALESCE(SUM(revenue), 0)::numeric as total_revenue,
    COALESCE(SUM(purchases), 0)::numeric as total_purchases,
    COALESCE(SUM(revenue) - SUM(purchases), 0)::numeric as total_margin
  FROM realized_data;

  -- DIRECT_SALES: Direct sale invoices without contract (filtered by year)
  RETURN QUERY
  WITH direct_sales_data AS (
    SELECT 
      i.id as invoice_id,
      COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0) as revenue,
      CASE 
        WHEN COALESCE(i.credited_amount, 0) >= COALESCE(i.amount, 0) THEN 0
        ELSE COALESCE((
          SELECT SUM(
            (eq->>'purchase_price')::numeric * 
            COALESCE((eq->>'quantity')::numeric, 1)
          )
          FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
        ), 0) * (1 - COALESCE(i.credited_amount, 0) / NULLIF(i.amount, 0))
      END as purchases
    FROM invoices i
    WHERE i.company_id = user_company_id
      AND (i.contract_id IS NULL OR i.invoice_type = 'direct_sale')
      AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
  )
  SELECT 
    'direct_sales'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(revenue), 0)::numeric as total_revenue,
    COALESCE(SUM(purchases), 0)::numeric as total_purchases,
    COALESCE(SUM(revenue) - SUM(purchases), 0)::numeric as total_margin
  FROM direct_sales_data;

  -- FORECAST: Contracts without invoices yet (potential future revenue)
  RETURN QUERY
  WITH forecast_data AS (
    SELECT 
      c.id,
      COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36) as potential_revenue,
      COALESCE((
        SELECT SUM(ce.purchase_price * ce.quantity)
        FROM contract_equipment ce 
        WHERE ce.contract_id = c.id
      ), 0) as purchases
    FROM contracts c
    WHERE c.company_id = user_company_id
      AND c.status IN ('active', 'contract_sent')
      AND NOT EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.contract_id = c.id 
          AND EXTRACT(YEAR FROM COALESCE(i.invoice_date, i.created_at)) = target_year
      )
      AND EXTRACT(YEAR FROM COALESCE(c.contract_start_date, c.created_at)) = target_year
  )
  SELECT 
    'forecast'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(potential_revenue), 0)::numeric as total_revenue,
    COALESCE(SUM(purchases), 0)::numeric as total_purchases,
    COALESCE(SUM(potential_revenue) - SUM(purchases), 0)::numeric as total_margin
  FROM forecast_data;

END;
$$;