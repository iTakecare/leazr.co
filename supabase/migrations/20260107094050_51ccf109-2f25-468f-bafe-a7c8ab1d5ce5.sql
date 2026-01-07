CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status()
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
  -- Get user company ID
  SELECT company_id INTO user_company_id FROM profiles WHERE id = auth.uid();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;

  -- PENDING: Demandes en attente (exclut leaser_rejected et autres statuts finalisés)
  RETURN QUERY
  SELECT 
    'pending'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric AS total_revenue,
    COALESCE(SUM(eq_total.total_purchase), 0)::numeric AS total_purchases,
    (COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0) - COALESCE(SUM(eq_total.total_purchase), 0))::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)), 0) as total_purchase
    FROM offer_equipment oe WHERE oe.offer_id = o.id
  ) eq_total ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.converted_to_contract, false) = false
    AND COALESCE(o.workflow_status, 'draft') NOT IN (
      'accepted', 'validated', 'financed', 'contract_sent', 'signed', 'contract_signed', 
      'invoicing', 'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
    );

  -- ACCEPTED: Contrats acceptés/signés
  RETURN QUERY
  SELECT 
    'accepted'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric AS total_revenue,
    COALESCE(SUM(eq_total.total_purchase), 0)::numeric AS total_purchases,
    (COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0) - COALESCE(SUM(eq_total.total_purchase), 0))::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)), 0) as total_purchase
    FROM offer_equipment oe WHERE oe.offer_id = o.id
  ) eq_total ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.workflow_status, 'draft') IN ('accepted', 'validated', 'financed', 'contract_sent', 'signed', 'contract_signed', 'invoicing');

  -- REJECTED: Demandes rejetées
  RETURN QUERY
  SELECT 
    'rejected'::text AS status,
    COUNT(DISTINCT o.id)::bigint AS count,
    COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0)::numeric AS total_revenue,
    COALESCE(SUM(eq_total.total_purchase), 0)::numeric AS total_purchases,
    (COALESCE(SUM(COALESCE(o.financed_amount, o.amount, 0)), 0) - COALESCE(SUM(eq_total.total_purchase), 0))::numeric AS total_margin
  FROM offers o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1)), 0) as total_purchase
    FROM offer_equipment oe WHERE oe.offer_id = o.id
  ) eq_total ON true
  WHERE o.company_id = user_company_id
    AND COALESCE(o.workflow_status, 'draft') IN ('internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected');

  RETURN;
END;
$$;