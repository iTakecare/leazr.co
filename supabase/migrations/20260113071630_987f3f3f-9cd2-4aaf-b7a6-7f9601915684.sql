-- Mettre à jour actual_purchase_date avec contract_start_date
-- et actual_purchase_price avec purchase_price pour tous les équipements
-- des contrats actifs/signés/livrés
UPDATE contract_equipment ce
SET 
  actual_purchase_date = c.contract_start_date,
  actual_purchase_price = COALESCE(ce.actual_purchase_price, ce.purchase_price)
FROM contracts c
WHERE ce.contract_id = c.id
  AND c.status IN ('active', 'signed', 'delivered')
  AND c.contract_start_date IS NOT NULL
  AND (ce.actual_purchase_date IS NULL OR ce.actual_purchase_price IS NULL);