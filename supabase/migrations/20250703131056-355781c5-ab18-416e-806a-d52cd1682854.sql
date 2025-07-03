-- Étape 1: Détacher les contrats des factures dupliquées (garder la plus récente)
UPDATE public.contracts 
SET invoice_id = NULL, invoice_generated = false 
WHERE invoice_id IN (
  SELECT i1.id 
  FROM public.invoices i1
  WHERE EXISTS (
    SELECT 1 FROM public.invoices i2 
    WHERE i2.contract_id = i1.contract_id 
    AND i2.created_at > i1.created_at
  )
);

-- Étape 2: Supprimer les factures dupliquées (garder la plus récente)
DELETE FROM public.invoices 
WHERE id IN (
  SELECT i1.id 
  FROM public.invoices i1
  WHERE EXISTS (
    SELECT 1 FROM public.invoices i2 
    WHERE i2.contract_id = i1.contract_id 
    AND i2.created_at > i1.created_at
  )
);