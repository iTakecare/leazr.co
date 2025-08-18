-- Update the offer_equipment records with correct purchase prices and calculated margins
UPDATE offer_equipment 
SET 
  purchase_price = 1200.00,
  margin = (77.95 * 36) - 1200.00, -- monthly_payment * 36 months - purchase_price
  updated_at = now()
WHERE id = '949d77f6-9191-4a03-8df0-d79f750e3c1f'; -- iMac M3 24 pouces

UPDATE offer_equipment 
SET 
  purchase_price = 150.00,
  margin = (5.95 * 36) - 150.00, -- monthly_payment * 36 months - purchase_price  
  updated_at = now()
WHERE id = '3efa4699-5675-48ec-a81e-8543f588b215'; -- Apple Smart Keyboard iPad Pro 11 Azerty