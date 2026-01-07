-- 1. Supprimer les anciens équipements de l'offre
DELETE FROM offer_equipment 
WHERE offer_id = 'daf5713a-e996-4616-ae25-b38881df8e45';

-- 2. Insérer les équipements du pack à 119.90€
INSERT INTO offer_equipment (offer_id, title, purchase_price, monthly_payment, quantity, margin, product_id)
VALUES 
  ('daf5713a-e996-4616-ae25-b38881df8e45', 'MacBook Pro 14 M4', 1179, 58.05, 1, 39.48, 'e414a247-0c60-4ad6-b1a5-f9ecde8c24f5'),
  ('daf5713a-e996-4616-ae25-b38881df8e45', 'iPhone 17 Pro Max', 1154, 53.95, 1, 32.44, '42c89b05-7c87-492b-a5c6-969f8373df22'),
  ('daf5713a-e996-4616-ae25-b38881df8e45', 'Microsoft Office Famille et Petite Entreprise 2021', 38, 3.95, 1, 194.47, 'd8153cd4-1c73-4e33-b24b-e8d38bcd2a76'),
  ('daf5713a-e996-4616-ae25-b38881df8e45', 'Pack Accessoires Portable', 60, 3.95, 1, 86.50, '91b06794-65ed-4f9c-b152-0ff40d4b08c2');

-- 3. Mettre à jour les totaux de l'offre
UPDATE offers SET 
  monthly_payment = 119.90,
  amount = 2431,
  equipment_description = 'Pack Promo 01/2026 - MacBook Pro 14 M4 + iPhone 17 Pro Max'
WHERE id = 'daf5713a-e996-4616-ae25-b38881df8e45';