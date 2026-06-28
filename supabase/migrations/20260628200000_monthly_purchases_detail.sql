-- Détail des achats d'un mois (pour la modale au clic sur le montant Achats du Tableau Mensuel)
-- Même logique de ventilation que get_monthly_financial_data(p_year) :
--   A. unités leasing (equipment_order_units)  B. lignes leasing sans unités  C. ventes directes
CREATE OR REPLACE FUNCTION public.get_monthly_purchases_detail(p_year integer, p_month integer)
 RETURNS TABLE(
   source text,
   equipment_title text,
   client_name text,
   reference text,
   supplier_name text,
   quantity numeric,
   cost numeric,
   purchase_date date,
   kind text,
   record_id uuid
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_company_id uuid;
BEGIN
  SELECT company_id INTO user_company_id FROM profiles WHERE id = auth.uid();

  RETURN QUERY
  WITH contract_invoice_in_year AS (
    SELECT DISTINCT ON (i.contract_id) i.contract_id, i.invoice_date
    FROM invoices i
    WHERE i.invoice_date >= make_date(p_year, 1, 1)
      AND i.invoice_date <= make_date(p_year, 12, 31)
      AND i.invoice_date IS NOT NULL AND i.contract_id IS NOT NULL
    ORDER BY i.contract_id, i.invoice_date
  )
  -- A. Unités leasing
  SELECT
    'Leasing (unité)'::text,
    ce.title::text,
    c.client_name::text,
    COALESCE(c.contract_number, '—')::text,
    COALESCE(s.name, '—')::text,
    1::numeric,
    COALESCE(u.supplier_price, ce.actual_purchase_price, ce.purchase_price)::numeric,
    COALESCE(u.order_date, ce.actual_purchase_date, ce.order_date,
      (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
       WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
      ciiy.invoice_date)::date,
    'unit'::text,
    u.id
  FROM equipment_order_units u
  JOIN contract_equipment ce ON ce.id = u.source_equipment_id AND u.source_type = 'contract'
  JOIN contracts c ON c.id = ce.contract_id
  LEFT JOIN contract_invoice_in_year ciiy ON ciiy.contract_id = c.id
  LEFT JOIN suppliers s ON s.id = u.supplier_id
  WHERE c.company_id = user_company_id
    AND COALESCE(c.is_self_leasing, false) = false
    AND COALESCE(u.supplier_price, ce.actual_purchase_price, ce.purchase_price) > 0
    AND c.status IN ('signed','active','delivered','completed','equipment_ordered','extended','defaulted','terminated')
    AND NOT (u.order_status = 'to_order' AND c.status IN ('signed','equipment_ordered'))
    AND EXTRACT(YEAR FROM COALESCE(u.order_date, ce.actual_purchase_date, ce.order_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date)) = p_year
    AND EXTRACT(MONTH FROM COALESCE(u.order_date, ce.actual_purchase_date, ce.order_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date)) = p_month

  UNION ALL

  -- B. Lignes leasing sans unités
  SELECT
    'Leasing'::text,
    ce.title::text,
    c.client_name::text,
    COALESCE(c.contract_number, '—')::text,
    COALESCE(s.name, '—')::text,
    COALESCE(ce.quantity, 1)::numeric,
    (COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1))::numeric,
    COALESCE(ce.order_date, ce.actual_purchase_date,
      (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
       WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
      ciiy.invoice_date)::date,
    'contract'::text,
    ce.id
  FROM contract_equipment ce
  JOIN contracts c ON c.id = ce.contract_id
  LEFT JOIN contract_invoice_in_year ciiy ON ciiy.contract_id = c.id
  LEFT JOIN suppliers s ON s.id = ce.supplier_id
  WHERE c.company_id = user_company_id
    AND COALESCE(c.is_self_leasing, false) = false
    AND NOT EXISTS (SELECT 1 FROM equipment_order_units u
                    WHERE u.source_type = 'contract' AND u.source_equipment_id = ce.id)
    AND COALESCE(ce.actual_purchase_price, ce.purchase_price) > 0
    AND c.status IN ('signed','active','delivered','completed','equipment_ordered','extended','defaulted','terminated')
    AND NOT (ce.order_status = 'to_order' AND c.status IN ('signed','equipment_ordered'))
    AND EXTRACT(YEAR FROM COALESCE(ce.order_date, ce.actual_purchase_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date)) = p_year
    AND EXTRACT(MONTH FROM COALESCE(ce.order_date, ce.actual_purchase_date,
        (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl
         WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
        ciiy.invoice_date)) = p_month

  UNION ALL

  -- C. Ventes directes (achats des offres is_purchase facturées)
  SELECT
    'Vente directe'::text,
    oe.title::text,
    o.client_name::text,
    COALESCE(o.dossier_number, '—')::text,
    COALESCE(s.name, '—')::text,
    COALESCE(oe.quantity, 1)::numeric,
    (COALESCE(oe.purchase_price, 0) * COALESCE(oe.quantity, 1))::numeric,
    i.invoice_date::date,
    'offer'::text,
    oe.id
  FROM invoices i
  JOIN offer_equipment oe ON oe.offer_id = i.offer_id
  JOIN offers o ON o.id = i.offer_id
  LEFT JOIN suppliers s ON s.id = oe.supplier_id
  WHERE i.company_id = user_company_id
    AND i.invoice_type = 'purchase'
    AND EXTRACT(YEAR FROM i.invoice_date) = p_year
    AND EXTRACT(MONTH FROM i.invoice_date) = p_month

  ORDER BY 7 DESC;
END;
$function$;
