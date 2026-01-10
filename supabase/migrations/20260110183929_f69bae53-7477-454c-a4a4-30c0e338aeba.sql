-- Corriger offer_equipment pour les offres importées (mensualité à 0 ou NULL)
WITH offer_totals AS (
  SELECT 
    o.id as offer_id,
    o.monthly_payment as global_monthly,
    SUM(COALESCE(oe.selling_price, 0) * COALESCE(oe.quantity, 1)) as total_selling_price
  FROM offers o
  JOIN offer_equipment oe ON oe.offer_id = o.id
  WHERE o.converted_to_contract = true
    AND o.monthly_payment > 0
  GROUP BY o.id, o.monthly_payment
)
UPDATE offer_equipment oe
SET monthly_payment = ROUND(
  ((COALESCE(oe.selling_price, 0) * COALESCE(oe.quantity, 1)) / ot.total_selling_price) * ot.global_monthly, 
  2
)
FROM offer_totals ot
WHERE oe.offer_id = ot.offer_id
  AND ot.total_selling_price > 0
  AND (oe.monthly_payment IS NULL OR oe.monthly_payment = 0);

-- Corriger contract_equipment pour les contrats importés (mensualité à 0 ou NULL)
WITH contract_totals AS (
  SELECT 
    c.id as contract_id,
    c.monthly_payment as global_monthly,
    SUM((COALESCE(ce.purchase_price, 0) + COALESCE(ce.margin, 0)) * COALESCE(ce.quantity, 1)) as total_selling_price
  FROM contracts c
  JOIN contract_equipment ce ON ce.contract_id = c.id
  WHERE c.monthly_payment > 0
  GROUP BY c.id, c.monthly_payment
)
UPDATE contract_equipment ce
SET monthly_payment = ROUND(
  (((COALESCE(ce.purchase_price, 0) + COALESCE(ce.margin, 0)) * COALESCE(ce.quantity, 1)) / ct.total_selling_price) * ct.global_monthly, 
  2
)
FROM contract_totals ct
WHERE ce.contract_id = ct.contract_id
  AND ct.total_selling_price > 0
  AND (ce.monthly_payment IS NULL OR ce.monthly_payment = 0);