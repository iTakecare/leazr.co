-- Fix get_contract_statistics_by_status function
-- 1. Fix c.duration -> c.contract_duration
-- 2. Remove year filter from 'pending' (active requests regardless of year)
-- 3. Remove year filter from 'forecast' (active contracts regardless of year)

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year INTEGER)
RETURNS TABLE(
  status TEXT,
  count BIGINT,
  total_revenue NUMERIC,
  total_purchases NUMERIC,
  total_margin NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  
  -- PENDING: Demandes en attente (PAS de filtre année - on veut toutes les demandes actives)
  SELECT 
    'pending'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    0::numeric as total_purchases,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_margin
  FROM offers o
  WHERE o.status = 'pending'
    AND o.converted_to_contract = false
    AND o.type = 'client_request'
  
  UNION ALL
  
  -- REALIZED: Contrats réalisés (facturés) pour l'année sélectionnée
  SELECT 
    'realized'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN i.amount IS NOT NULL THEN i.amount
        ELSE c.monthly_payment * COALESCE(c.contract_duration, 36)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce 
       WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE 
        WHEN i.amount IS NOT NULL THEN i.amount
        ELSE c.monthly_payment * COALESCE(c.contract_duration, 36)
      END
    ), 0)::numeric - COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce 
       WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_margin
  FROM contracts c
  LEFT JOIN invoices i ON i.contract_id = c.id AND i.status = 'paid'
  WHERE c.status IN ('active', 'completed')
    AND c.leaser_id IS NOT NULL
    AND EXTRACT(YEAR FROM c.created_at) = p_year
  
  UNION ALL
  
  -- DIRECT_SALES: Ventes directes pour l'année sélectionnée
  SELECT 
    'direct_sales'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe 
       WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(o.amount), 0)::numeric - COALESCE(SUM(
      (SELECT COALESCE(SUM(oe.purchase_price * oe.quantity), 0) 
       FROM offer_equipment oe 
       WHERE oe.offer_id = o.id)
    ), 0)::numeric as total_margin
  FROM offers o
  WHERE o.type = 'direct_sale'
    AND o.status = 'accepted'
    AND EXTRACT(YEAR FROM o.created_at) = p_year
  
  UNION ALL
  
  -- REFUSED: Offres refusées pour l'année sélectionnée
  SELECT 
    'refused'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    0::numeric as total_purchases,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_margin
  FROM offers o
  WHERE o.status IN ('rejected', 'cancelled')
    AND EXTRACT(YEAR FROM o.created_at) = p_year
  
  UNION ALL
  
  -- FORECAST: Prévisionnel contrats actifs (PAS de filtre année - contrats en cours)
  SELECT 
    'forecast'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce 
       WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(c.monthly_payment * COALESCE(c.contract_duration, 36)), 0)::numeric - COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce 
       WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.status = 'active'
    AND c.leaser_id IS NOT NULL;
    
END;
$$;