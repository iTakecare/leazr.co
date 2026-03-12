
-- Supprimer les doublons de factures purchase, garder la plus ancienne par offer_id
DELETE FROM invoices 
WHERE invoice_type = 'purchase' 
AND id NOT IN (
  SELECT DISTINCT ON (offer_id) id 
  FROM invoices 
  WHERE invoice_type = 'purchase' 
  ORDER BY offer_id, created_at ASC
);

-- Ajouter contrainte unique pour empêcher les doublons futurs
CREATE UNIQUE INDEX idx_invoices_unique_offer ON invoices (offer_id) WHERE offer_id IS NOT NULL;
