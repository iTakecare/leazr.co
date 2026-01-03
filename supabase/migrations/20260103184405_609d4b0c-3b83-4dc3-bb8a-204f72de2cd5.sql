DROP FUNCTION IF EXISTS public.get_contract_statistics_by_status(integer);

CREATE OR REPLACE FUNCTION public.get_contract_statistics_by_status(p_year integer)
RETURNS TABLE(status text, count bigint, total_revenue numeric, total_purchases numeric, total_margin numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY

  -- REALIZED: Contrats signés cette année (date_signature dans l'année sélectionnée)
  SELECT 
    'realized'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN c.type = 'direct_sale' THEN COALESCE(c.selling_price, c.financed_amount, 0)
        ELSE COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE 
        WHEN c.type = 'direct_sale' THEN COALESCE(c.selling_price, c.financed_amount, 0)
        ELSE COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
      END
      - (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
         FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.status IN ('active', 'signed', 'delivered')
    AND EXTRACT(YEAR FROM c.date_signature) = p_year

  UNION ALL

  -- DIRECT_SALES: Ventes directes cette année
  SELECT 
    'direct_sales'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(COALESCE(c.selling_price, c.financed_amount, 0)), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      COALESCE(c.selling_price, c.financed_amount, 0)
      - (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
         FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.type = 'direct_sale'
    AND c.status IN ('active', 'signed', 'delivered')
    AND EXTRACT(YEAR FROM c.date_signature) = p_year

  UNION ALL

  -- FORECAST: Contrats dont le premier loyer est prévu cette année
  SELECT 
    'forecast'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(
      COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
       FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      COALESCE(c.monthly_payment, 0) * COALESCE(c.contract_duration, 36)
      - (SELECT COALESCE(SUM(ce.purchase_price * ce.quantity), 0) 
         FROM contract_equipment ce WHERE ce.contract_id = c.id)
    ), 0)::numeric as total_margin
  FROM contracts c
  WHERE c.status IN ('active', 'signed')
    AND c.type != 'direct_sale'
    AND EXTRACT(YEAR FROM c.first_payment_date) = p_year

  UNION ALL

  -- PENDING: Stock actuel des demandes en attente (sans filtre année)
  SELECT 
    'pending'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment IS NOT NULL AND o.monthly_payment > 0 
             AND o.coefficient IS NOT NULL AND o.coefficient > 0 THEN
          o.monthly_payment * o.coefficient
        WHEN o.selling_price IS NOT NULL AND o.selling_price > 0 THEN
          o.selling_price
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), o.equipment_total_purchase_price, 0)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment IS NOT NULL AND o.monthly_payment > 0 
             AND o.coefficient IS NOT NULL AND o.coefficient > 0 THEN
          o.monthly_payment * o.coefficient
        WHEN o.selling_price IS NOT NULL AND o.selling_price > 0 THEN
          o.selling_price
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
      - COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), o.equipment_total_purchase_price, 0)
    ), 0)::numeric as total_margin
  FROM offers o
  WHERE o.status = 'pending'
    AND o.converted_to_contract = false

  UNION ALL

  -- REFUSED: Demandes refusées/sans suite cette année
  SELECT 
    'refused'::text as status,
    COUNT(*)::bigint as count,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment IS NOT NULL AND o.monthly_payment > 0 
             AND o.coefficient IS NOT NULL AND o.coefficient > 0 THEN
          o.monthly_payment * o.coefficient
        WHEN o.selling_price IS NOT NULL AND o.selling_price > 0 THEN
          o.selling_price
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
    ), 0)::numeric as total_revenue,
    COALESCE(SUM(
      COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), o.equipment_total_purchase_price, 0)
    ), 0)::numeric as total_purchases,
    COALESCE(SUM(
      CASE 
        WHEN o.monthly_payment IS NOT NULL AND o.monthly_payment > 0 
             AND o.coefficient IS NOT NULL AND o.coefficient > 0 THEN
          o.monthly_payment * o.coefficient
        WHEN o.selling_price IS NOT NULL AND o.selling_price > 0 THEN
          o.selling_price
        ELSE
          COALESCE(o.financed_amount, o.amount, 0)
      END
      - COALESCE((SELECT SUM(oe.purchase_price * oe.quantity) FROM offer_equipment oe WHERE oe.offer_id = o.id), o.equipment_total_purchase_price, 0)
    ), 0)::numeric as total_margin
  FROM offers o
  WHERE o.status IN ('rejected', 'cancelled', 'no_response')
    AND EXTRACT(YEAR FROM o.created_at) = p_year;

END;
$$;