-- Fix get_contract_statistics_by_status to return actual total_revenue for pending and refused
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT, total_revenue NUMERIC, total_purchases NUMERIC, total_margin NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- REALIZED: Contrats actifs/signés
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
  WHERE c.status IN ('active', 'signed')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)
  
  UNION ALL
  
  -- DIRECT_SALES: Ventes directes
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
  WHERE c.type = 'direct_sale'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM c.created_at) = p_year)
  
  UNION ALL
  
  -- PENDING: Offres en attente (CA potentiel)
  SELECT 
    'pending'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(o.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(o.monthly_payment * 12) - SUM(o.amount), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.status = 'pending'
    AND o.converted_to_contract = false
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- REFUSED: Offres refusées (CA perdu)
  SELECT 
    'refused'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(o.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(o.monthly_payment * 12) - SUM(o.amount), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.status IN ('rejected', 'refused', 'cancelled')
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year)
  
  UNION ALL
  
  -- FORECAST: Prévisionnel (offres acceptées non converties)
  SELECT 
    'forecast'::TEXT AS status,
    COUNT(DISTINCT o.id)::BIGINT AS count,
    COALESCE(SUM(o.monthly_payment * 12), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.amount), 0)::NUMERIC AS total_purchases,
    COALESCE(SUM(o.monthly_payment * 12) - SUM(o.amount), 0)::NUMERIC AS total_margin
  FROM offers o
  WHERE o.status = 'accepted'
    AND o.converted_to_contract = false
    AND (p_year IS NULL OR EXTRACT(YEAR FROM o.created_at) = p_year);
END;
$$;