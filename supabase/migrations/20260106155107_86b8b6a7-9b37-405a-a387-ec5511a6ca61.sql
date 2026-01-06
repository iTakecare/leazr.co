-- Normalisation des offres d'achat existantes
-- 1. Mettre monthly_payment = 0 sur les équipements des offres d'achat
-- 2. Remplir selling_price s'il est NULL (via purchase_price * (1 + margin/100))
-- 3. Mettre à jour les totaux de l'offre

-- Étape 1: Mettre à jour offer_equipment pour les offres d'achat
UPDATE offer_equipment
SET 
  monthly_payment = 0,
  selling_price = CASE 
    WHEN selling_price IS NULL OR selling_price = 0 
    THEN purchase_price * (1 + COALESCE(margin, 0) / 100)
    ELSE selling_price
  END
WHERE offer_id IN (
  SELECT id FROM offers WHERE is_purchase = true
);

-- Étape 2: Mettre à jour les totaux des offres d'achat
WITH equipment_totals AS (
  SELECT 
    oe.offer_id,
    SUM(oe.purchase_price * oe.quantity) as total_purchase,
    SUM(oe.selling_price * oe.quantity) as total_selling
  FROM offer_equipment oe
  INNER JOIN offers o ON o.id = oe.offer_id
  WHERE o.is_purchase = true
  GROUP BY oe.offer_id
)
UPDATE offers
SET 
  monthly_payment = 0,
  amount = COALESCE(et.total_purchase, offers.amount),
  financed_amount = COALESCE(et.total_selling, offers.financed_amount),
  margin = COALESCE(et.total_selling - et.total_purchase, offers.margin)
FROM equipment_totals et
WHERE offers.id = et.offer_id
AND offers.is_purchase = true;