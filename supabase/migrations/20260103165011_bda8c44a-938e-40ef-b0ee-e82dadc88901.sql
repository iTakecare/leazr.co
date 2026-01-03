-- D'abord supprimer la fonction existante car le type de retour est différent
DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(INTEGER);

-- Recréer avec la correction du comptage "pending"
CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  status text,
  count bigint,
  total_amount numeric,
  total_monthly numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_company_id UUID;
  target_year INTEGER := COALESCE(p_year, EXTRACT(year FROM now())::INTEGER);
BEGIN
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  
  -- EN ATTENTE = Offres non converties avec statuts intermédiaires (PAS de filtre année)
  SELECT
    'pending'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_amount,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_monthly
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
  
  UNION ALL
  
  -- CONTRATS RÉALISÉS = Factures leasing de l'année sélectionnée
  SELECT
    'realized'::text as status,
    COUNT(DISTINCT i.contract_id)::bigint as count,
    COALESCE(SUM(i.amount), 0)::numeric as total_amount,
    COALESCE(SUM(
      CASE 
        WHEN c.contract_duration > 0 THEN i.amount / c.contract_duration
        ELSE 0
      END
    ), 0)::numeric as total_monthly
  FROM invoices i
  LEFT JOIN contracts c ON i.contract_id = c.id
  WHERE i.company_id = user_company_id
    AND i.contract_id IS NOT NULL
    AND i.invoice_type = 'leasing'
    AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year
  
  UNION ALL
  
  -- VENTES DIRECTES = Factures d'achat de l'année sélectionnée
  SELECT
    'direct_sales'::text as status,
    COUNT(DISTINCT i.id)::bigint as count,
    COALESCE(SUM(i.amount), 0)::numeric as total_amount,
    0::numeric as total_monthly
  FROM invoices i
  WHERE i.company_id = user_company_id
    AND i.invoice_type = 'purchase'
    AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = target_year
  
  UNION ALL
  
  -- REFUSÉS/SANS SUITE = Offres refusées ou expirées de l'année sélectionnée
  SELECT
    'refused'::text as status,
    COUNT(DISTINCT o.id)::bigint as count,
    COALESCE(SUM(o.amount), 0)::numeric as total_amount,
    COALESCE(SUM(o.monthly_payment), 0)::numeric as total_monthly
  FROM offers o
  WHERE o.company_id = user_company_id
    AND o.converted_to_contract = false
    AND o.workflow_status IN ('refused', 'expired', 'cancelled', 'internal_rejected', 'leaser_rejected')
    AND EXTRACT(year FROM COALESCE(o.updated_at, o.created_at)) = target_year
  
  UNION ALL
  
  -- PRÉVISIONNEL = Contrats signés mais pas encore facturés (PAS de filtre année)
  SELECT
    'forecast'::text as status,
    COUNT(DISTINCT c.id)::bigint as count,
    COALESCE(SUM(
      (SELECT SUM(ce.purchase_price * (1 + COALESCE(ce.margin, 0) / 100) * ce.quantity)
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_amount,
    COALESCE(SUM(c.monthly_payment), 0)::numeric as total_monthly
  FROM contracts c
  WHERE c.company_id = user_company_id
    AND c.status IN ('active', 'contract_sent')
    AND c.signature_status = 'signed'
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.contract_id = c.id 
        AND i.invoice_type = 'leasing'
    );
END;
$function$;