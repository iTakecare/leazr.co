-- Drop and recreate the function with correct column names matching TypeScript interface
DROP FUNCTION IF EXISTS get_contract_statistics_by_status(integer);

CREATE OR REPLACE FUNCTION get_contract_statistics_by_status(p_year INTEGER)
RETURNS TABLE (
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
  -- Récupérer l'ID de la company de l'utilisateur actuel
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = auth.uid();

  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'User company not found';
  END IF;

  RETURN QUERY
  -- PENDING (EN ATTENTE) - Offres non converties avec statuts intermédiaires
  SELECT
    'pending'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    0::numeric as total_purchases,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.converted_to_contract = false
    AND o.workflow_status IN (
      'draft', 'sent', 'offer_send', 'pending',
      'internal_approved', 'internal_docs_requested',
      'info_requested', 'leaser_introduced',
      'leaser_docs_requested', 'score_leaser',
      'offer_accepted', 'leaser_review', 'internal_review'
    )
    AND EXTRACT(YEAR FROM o.created_at) = p_year

  UNION ALL

  -- REALIZED (RÉALISÉ) - Contrats avec factures payées
  SELECT
    'realized'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(
      CASE WHEN inv.status = 'paid' THEN inv.amount ELSE 0 END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      CASE WHEN inv.status = 'paid' THEN ce.purchase_price * ce.quantity ELSE 0 END
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE WHEN inv.status = 'paid' THEN inv.amount ELSE 0 END
    ), 0)::numeric - COALESCE(SUM(
      CASE WHEN inv.status = 'paid' THEN ce.purchase_price * ce.quantity ELSE 0 END
    ), 0)::numeric as total_margin
  FROM contracts c
  LEFT JOIN invoices inv ON inv.contract_id = c.id
  LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
  WHERE c.company_id = user_company_id
    AND c.leaser_id IS NOT NULL
    AND EXTRACT(YEAR FROM c.created_at) = p_year

  UNION ALL

  -- DIRECT SALES (VENTES DIRECTES) - Contrats sans leaser
  SELECT
    'direct_sales'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(c.monthly_payment * c.duration), 0)::numeric as total_revenue,
    COALESCE(SUM(ce.purchase_price * ce.quantity), 0)::numeric as total_purchases,
    COALESCE(SUM(c.monthly_payment * c.duration), 0)::numeric - COALESCE(SUM(ce.purchase_price * ce.quantity), 0)::numeric as total_margin
  FROM contracts c
  LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
  WHERE c.company_id = user_company_id
    AND c.leaser_id IS NULL
    AND EXTRACT(YEAR FROM c.created_at) = p_year

  UNION ALL

  -- REFUSED (REFUSÉ) - Offres refusées/rejetées
  SELECT
    'refused'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_revenue,
    0::numeric as total_purchases,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_margin
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.workflow_status IN ('refused', 'internal_rejected', 'leaser_rejected', 'cancelled', 'expired')
    AND EXTRACT(YEAR FROM o.created_at) = p_year

  UNION ALL

  -- FORECAST (PRÉVISIONNEL) - Contrats actifs avec financement
  SELECT
    'forecast'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(c.financed_amount), 0)::numeric as total_revenue,
    COALESCE(SUM(ce.purchase_price * ce.quantity), 0)::numeric as total_purchases,
    COALESCE(SUM(c.financed_amount), 0)::numeric - COALESCE(SUM(ce.purchase_price * ce.quantity), 0)::numeric as total_margin
  FROM contracts c
  LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
  WHERE c.company_id = user_company_id
    AND c.leaser_id IS NOT NULL
    AND c.status IN ('active', 'pending')
    AND EXTRACT(YEAR FROM c.created_at) = p_year;
END;
$$;