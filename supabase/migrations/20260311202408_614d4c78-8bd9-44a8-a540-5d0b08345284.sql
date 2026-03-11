
-- Step 1: Generate dossier_number for ALL offers missing one
UPDATE offers o
SET dossier_number = sub.generated_number
FROM (
  SELECT id, 
    'ITC-' || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::TEXT || '-OFF-' || LPAD(rn::TEXT, 4, '0') as generated_number
  FROM (
    SELECT id, created_at, 
      ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM offers
    WHERE dossier_number IS NULL
  ) numbered
) sub
WHERE o.id = sub.id;

-- Step 2: Fix coefficient for offers where financed amount > 2500€ but coefficient is 3.53
UPDATE offers
SET 
  coefficient = 3.24,
  amount = ROUND((monthly_payment * 100 / 3.24)::numeric, 2),
  financed_amount = ROUND((monthly_payment * 100 / 3.24)::numeric, 2)
WHERE coefficient = 3.53 
  AND monthly_payment > 0 
  AND (monthly_payment * 100 / 3.24) > 2500;

-- Step 3: Recalculate equipment selling_price and margin
-- In PostgreSQL UPDATE...FROM, the target table cannot be referenced in JOIN, 
-- so we compute everything in the FROM subquery
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
    ROUND((o.monthly_payment * 100 / 3.24)::numeric, 2) as financed_amount,
    COALESCE(t.total_purchase, 0) as total_purchase
  FROM offers o
  LEFT JOIN (
    SELECT offer_id, SUM(purchase_price * quantity) as total_purchase
    FROM offer_equipment
    GROUP BY offer_id
  ) t ON t.offer_id = o.id
  WHERE o.coefficient = 3.24 AND o.monthly_payment > 0
) calc
WHERE oe.offer_id = calc.offer_id AND calc.total_purchase > 0;
