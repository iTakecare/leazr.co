-- Fix get_contract_statistics_by_status: correct column name and add company_id security
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
  
  -- PENDING: Offres en attente (CA potentiel) - PAS de filtre année
  SELECT 
    'pending'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(o.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(o.monthly_payment * 12) - SUM(o.amount), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.status = 'pending'
    AND o.converted_to_contract = false
  
  UNION ALL
  
  -- REFUSED: Offres refusées (CA perdu)
  SELECT 
    'refused'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(o.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(o.monthly_payment * 12) - SUM(o.amount), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.status IN ('rejected', 'refused', 'cancelled')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- FORECAST: Prévisionnel (offres acceptées non converties) - PAS de filtre année
  SELECT 
    'forecast'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(o.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(o.monthly_payment * 12) - SUM(o.amount), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.status = 'accepted'
    AND o.converted_to_contract = false;
END;
$$;