-- Nettoyer les doublons dans la table invoices en gardant la facture la plus récente pour chaque contrat
WITH duplicates AS (
  SELECT id, contract_id,
         ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY created_at DESC) as rn
  FROM public.invoices
),
invoices_to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
-- D'abord, détacher les contrats des factures dupliquées
UPDATE public.contracts 
SET invoice_id = NULL, invoice_generated = false 
WHERE invoice_id IN (SELECT id FROM invoices_to_delete);

-- Ensuite, supprimer les factures dupliquées
DELETE FROM public.invoices 
WHERE id IN (SELECT id FROM invoices_to_delete);