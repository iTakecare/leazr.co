-- Mettre à jour les contrats qui ont une note de crédit mais qui ne sont pas encore annulés
UPDATE contracts 
SET status = 'cancelled', 
    updated_at = NOW()
WHERE id IN (
  SELECT c.id 
  FROM contracts c
  JOIN invoices i ON i.contract_id = c.id
  JOIN credit_notes cn ON cn.invoice_id = i.id
  WHERE c.status != 'cancelled'
);