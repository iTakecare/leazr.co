-- Fix get_contract_statistics_by_status function
-- Align pending logic with "in_progress" from Demandes page
-- Align refused logic with workflow_status values used in frontend
-- Add company_id scoping to all sections

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
DECLARE
  user_company_id UUID;
BEGIN
  -- Get user's company_id
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  
  -- PENDING: Demandes en cours (same logic as "in_progress" tab in Demandes page)
  -- No year filter - we want all active requests
  -- Exclude: accepted, invoiced, rejected statuses
  SELECT 
    'pending'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    0::numeric as total_purchases,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.converted_to_contract = false
    AND LOWER(COALESCE(o.workflow_status, '')) NOT IN (
      -- Accepted statuses
      'accepted', 'validated', 'financed', 'contract_sent', 'signed',
      -- Invoiced status
      'invoicing',
      -- Rejected statuses
      'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
    )
  
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
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'completed')
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
  WHERE o.company_id = user_company_id
    AND o.type = 'direct_sale'
    AND o.status = 'accepted'
    AND EXTRACT(YEAR FROM o.created_at) = p_year
  
  UNION ALL
  
  -- REFUSED: Offres refusées pour l'année sélectionnée (using workflow_status)
  SELECT 
    'refused'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    0::numeric as total_purchases,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND LOWER(o.workflow_status) IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected')
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
  WHERE c.company_id = user_company_id
    AND c.status = 'active'
    AND c.leaser_id IS NOT NULL;
    
END;
$$;