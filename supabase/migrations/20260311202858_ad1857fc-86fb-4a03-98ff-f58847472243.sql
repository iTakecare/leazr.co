
-- Fix 6 Grenke Lease offers with coefficient 3.14 that should be 3.24 (financed 2500-5000)
UPDATE offers
SET 
  coefficient = 3.24,
  amount = ROUND((monthly_payment * 100 / 3.24)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / 3.24)::numeric, 2)
WHERE id IN (
  'c25ab5fe-3779-43ac-9c88-12bc72e4af82',
  '53df45bd-c557-4262-940c-29e57dd4877c',
  '42d561ce-f210-46dd-ab6b-98709b724f4a',
  '2e87cf1a-2718-438b-aec6-7aed5424a97d',
  '463213de-5ffd-42f9-8ceb-9de515b7c86d',
  'a9b0620b-3e48-40f5-b475-2fee99ac4969'
);

-- Fix 1 Grenke offer with coefficient 3.05 → should be 3.16 (financed 5000-12500)
UPDATE offers
SET 
  coefficient = 3.16,
  amount = ROUND((monthly_payment * 100 / 3.16)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / 3.16)::numeric, 2)
WHERE id = 'e6dae7d5-5d1a-4d76-ae0b-ebf34248317e';

-- Fix 1 Grenke offer with coefficient 3.1602 → should be 3.16 (financed 5000-12500)
UPDATE offers
SET 
  coefficient = 3.16,
  amount = ROUND((monthly_payment * 100 / 3.16)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / 3.16)::numeric, 2)
WHERE id = '12cd9c20-1100-4a91-80c1-5aa9364635a9';

-- Fix 1 iTakecare offer with coefficient 2.777 → should be 3.55
UPDATE offers
SET 
  coefficient = 3.55,
  amount = ROUND((monthly_payment * 100 / 3.55)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / 3.55)::numeric, 2)
WHERE id = 'd2fc28ae-bf2d-4b95-a011-78d8f8ffa9b6';

-- Fix 1 iTakecare offer with coefficient 3.33 → should be 3.55
UPDATE offers
SET 
  coefficient = 3.55,
  amount = ROUND((monthly_payment * 100 / 3.55)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / 3.55)::numeric, 2)
WHERE id = '8ea5c5d1-35f5-4e72-8323-8370579564aa';

-- Also fix offers where amount != financed_amount for coefficient 3.24 meta offers
UPDATE offers
SET 
  amount = ROUND((monthly_payment * 100 / coefficient)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / coefficient)::numeric, 2)
WHERE source IN ('facebook', 'meta')
  AND monthly_payment > 0
  AND amount != ROUND((monthly_payment * 100 / coefficient)::numeric, 2);

-- Recalculate equipment selling_price and margin for all corrected offers
UPDATE offer_equipment oe
SET 
  selling_price = CASE 
    WHEN calc.total_purchase > 0 THEN 
      ROUND((oe.purchase_price * oe.quantity * calc.financed_amount / calc.total_purchase / oe.quantity)::numeric, 2)
    ELSE oe.selling_price
  END,
  margin = CASE 
    WHEN oe.purchase_price > 0 AND calc.total_purchase > 0 THEN
      ROUND(((oe.purchase_price * oe.quantity * calc.financed_amount / calc.total_purchase / oe.quantity - oe.purchase_price) / oe.purchase_price * 100)::numeric, 2)
    ELSE oe.margin
  END
FROM (
  SELECT 
    o.id as offer_id,
    ROUND((o.monthly_payment * 100 / o.coefficient)::numeric, 2) as financed_amount,
    COALESCE(t.total_purchase, 0) as total_purchase
  FROM offers o
  LEFT JOIN (
    SELECT offer_id, SUM(purchase_price * quantity) as total_purchase
    FROM offer_equipment
    GROUP BY offer_id
  ) t ON t.offer_id = o.id
  WHERE o.source IN ('facebook', 'meta') AND o.monthly_payment > 0
) calc
WHERE oe.offer_id = calc.offer_id AND calc.total_purchase > 0;
