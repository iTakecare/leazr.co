-- Mettre à jour actual_purchase_date avec la date de demande initiale (request_date)
-- de l'offre liée, avec fallback sur offer.created_at si request_date est NULL
UPDATE contract_equipment ce
SET 
  actual_purchase_date = COALESCE(o.request_date, o.created_at)::date,
  actual_purchase_price = COALESCE(ce.actual_purchase_price, ce.purchase_price)
FROM contracts c
JOIN offers o ON c.offer_id = o.id
WHERE ce.contract_id = c.id
  AND c.status IN ('active', 'signed', 'delivered')
  AND c.offer_id IS NOT NULL
  AND (ce.actual_purchase_date IS NULL OR ce.actual_purchase_date != COALESCE(o.request_date, o.created_at)::date);