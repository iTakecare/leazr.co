-- Fix get_contract_statistics_by_status: use workflow_status, calculate from offer_equipment, exclude direct purchases
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status();
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer, uuid);

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT, total_revenue NUMERIC, total_purchases NUMERIC, total_margin NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Get user's company for security filtering
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  
  -- REALIZED: Contrats actifs/signés (avec leaser, pas self-leasing)
  SELECT 
    'realized'::TEXT AS status,
    COUNT(DISTINCT c.id)::BIGINT AS count,
    COALESCE(SUM(c.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(
      (SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(c.monthly_payment * 12) - SUM(
      (SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::NUMERIC AS total_margin
  FROM contracts c
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'signed')
    AND (c.is_self_leasing IS NULL OR c.is_self_leasing = false)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)
  
  UNION ALL
  
  -- DIRECT_SALES: Ventes directes (self-leasing)
  SELECT 
    'direct_sales'::TEXT AS status,
    COUNT(DISTINCT c.id)::BIGINT AS count,
    COALESCE(SUM(c.monthly_payment), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(
      (SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(c.monthly_payment) - SUM(
      (SELECT SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::NUMERIC AS total_margin
  FROM contracts c
  WHERE c.company_id = user_company_id
    AND c.is_self_leasing = true
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)
  
  UNION ALL
  
  -- PENDING: Offres en attente (CA potentiel) - basé sur workflow_status, exclut achats directs
  SELECT 
    'pending'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.monthly_payment) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.monthly_payment
      ) * 12
    ), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(
      CASE 
        WHEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id) > 0 
        THEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ELSE COALESCE(o.estimated_budget, 0)
      END
    ), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.monthly_payment) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.monthly_payment
      ) * 12
    ) - SUM(
      CASE 
        WHEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id) > 0 
        THEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ELSE COALESCE(o.estimated_budget, 0)
      END
    ), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.workflow_status IN ('draft', 'sent', 'offer_send', 'info_requested', 'info_received', 'internal_docs_requested', 'internal_approved', 'leaser_review', 'leaser_introduced')
    AND o.converted_to_contract = false
    AND COALESCE(o.is_purchase, false) = false
  
  UNION ALL
  
  -- REFUSED: Offres refusées (CA perdu) - basé sur workflow_status
  SELECT 
    'refused'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.monthly_payment) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.monthly_payment
      ) * 12
    ), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(
      CASE 
        WHEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id) > 0 
        THEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ELSE COALESCE(o.estimated_budget, 0)
      END
    ), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.monthly_payment) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.monthly_payment
      ) * 12
    ) - SUM(
      CASE 
        WHEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id) > 0 
        THEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ELSE COALESCE(o.estimated_budget, 0)
      END
    ), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.workflow_status IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
    AND COALESCE(o.is_purchase, false) = false
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- FORECAST: Prévisionnel (offres acceptées non converties) - basé sur workflow_status
  SELECT 
    'forecast'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.monthly_payment) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.monthly_payment
      ) * 12
    ), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(
      CASE 
        WHEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id) > 0 
        THEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ELSE COALESCE(o.estimated_budget, 0)
      END
    ), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(
      COALESCE(
        (SELECT SUM(oe.monthly_payment) FROM offer_equipment oe WHERE oe.offer_id = o.id),
        o.monthly_payment
      ) * 12
    ) - SUM(
      CASE 
        WHEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id) > 0 
        THEN (SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id)
        ELSE COALESCE(o.estimated_budget, 0)
      END
    ), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.workflow_status IN ('approved', 'accepted', 'validated', 'financed', 'contract_sent', 'signed')
    AND o.converted_to_contract = false
    AND COALESCE(o.is_purchase, false) = false;
END;
$$;