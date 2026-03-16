
-- Backfill: fix offer_equipment.purchase_price = 0 using variant price matching by monthly_price
UPDATE offer_equipment oe
SET purchase_price = matched.variant_price
FROM (
  SELECT DISTINCT ON (oe2.id) oe2.id, pvp.price AS variant_price
  FROM offer_equipment oe2
  JOIN product_variant_prices pvp ON pvp.product_id = oe2.product_id
  WHERE oe2.purchase_price = 0
    AND oe2.product_id IS NOT NULL
    AND oe2.monthly_payment > 0
    AND pvp.monthly_price IS NOT NULL
    AND pvp.price > 0
    AND ABS(pvp.monthly_price - (oe2.monthly_payment / GREATEST(oe2.quantity, 1))) < 0.02
  ORDER BY oe2.id, ABS(pvp.monthly_price - (oe2.monthly_payment / GREATEST(oe2.quantity, 1)))
) matched
WHERE oe.id = matched.id;
