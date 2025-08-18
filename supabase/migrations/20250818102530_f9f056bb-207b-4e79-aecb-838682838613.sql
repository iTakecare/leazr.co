-- Update purchase prices for the product variants used in the offer
UPDATE product_variant_prices 
SET 
  price = 1200.00,
  updated_at = now()
WHERE id = 'b57c652a-c1c2-4236-b7f2-b290aee6009c'; -- iMac M3 24 pouces variant

UPDATE product_variant_prices 
SET 
  price = 150.00,
  updated_at = now()
WHERE id = '047feb90-9025-4e8b-b026-30df38d362cb'; -- Apple Smart Keyboard iPad Pro 11 Azerty variant