-- Fix get_contract_statistics_by_status to use financed_amount for CA calculation
-- Drop all existing overloads
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

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
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Get the user's company_id for multi-tenant security
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  
  -- PENDING offers (En Attente) - using workflow_status
  SELECT 
    'PENDING'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(
      CASE 
        -- Priority 1: Inverse Grenke formula
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN
          o.monthly_payment * 100 / o.coefficient
        -- Priority 2: selling_price
        WHEN COALESCE(o.selling_price, 0) > 0 THEN
          o.selling_price
        -- Priority 3: financed_amount or amount
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.equipment_total_purchase_price,
        0
      )
    ), 0)::numeric as total_purchases,
    0::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND o.converted_to_contract = false
    AND o.workflow_status IN ('draft', 'sent', 'offer_sent', 'info_requested', 'info_received', 'internal_docs_requested', 'internal_approved', 'leaser_review', 'leaser_introduced')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- REFUSED offers (Refusés/Sans Suite)
  SELECT 
    'REFUSED'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN
          o.monthly_payment * 100 / o.coefficient
        WHEN COALESCE(o.selling_price, 0) > 0 THEN
          o.selling_price
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.equipment_total_purchase_price,
        0
      )
    ), 0)::numeric as total_purchases,
    0::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND o.converted_to_contract = false
    AND o.workflow_status IN ('rejected', 'client_no_response', 'leaser_rejected', 'cancelled', 'expired')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- FORECAST offers (Prévisionnel - offers approved but not yet converted)
  SELECT 
    'FORECAST'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment > 0 AND o.coefficient > 0 THEN
          o.monthly_payment * 100 / o.coefficient
        WHEN COALESCE(o.selling_price, 0) > 0 THEN
          o.selling_price
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.equipment_total_purchase_price,
        0
      )
    ), 0)::numeric as total_purchases,
    0::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND COALESCE(o.is_purchase, false) = false
    AND o.converted_to_contract = false
    AND o.workflow_status IN ('client_approved', 'leaser_approved', 'accepted', 'signed')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- REALIZED contracts (Contrats Réalisés - leasing)
  SELECT 
    'REALIZED'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN c.coefficient > 0 AND c.monthly_payment > 0 THEN
          c.monthly_payment * 100 / c.coefficient
        ELSE
          COALESCE(c.financed_amount, c.monthly_payment * COALESCE(c.contract_duration, 36), 0)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id),
        0
      )
    ), 0)::numeric as total_purchases,
    0::numeric as total_margin
  FROM contracts c
  WHERE c.company_id = user_company_id
    AND COALESCE(c.leaser_id IS NOT NULL, true)
    AND c.status NOT IN ('cancelled', 'terminated')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)
  
  UNION ALL
  
  -- DIRECT_SALES (Ventes directes / Self-leasing)
  SELECT 
    'DIRECT_SALES'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(
      COALESCE(c.selling_price, c.financed_amount, 0)
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(ce.purchase_price * ce.quantity) FROM contract_equipment ce WHERE ce.contract_id = c.id),
        0
      )
    ), 0)::numeric as total_purchases,
    0::numeric as total_margin
  FROM contracts c
  WHERE c.company_id = user_company_id
    AND c.leaser_id IS NULL
    AND c.status NOT IN ('cancelled', 'terminated')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year);
END;
$$;