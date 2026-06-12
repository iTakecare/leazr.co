-- Affectation de chaque facture d'achat de marchandises :
--   contract = lié à un contrat (via matching), stock = en attente d'attribution,
--   internal = usage interne (à amortir). null = à affecter.
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS allocation text;  -- 'contract' | 'stock' | 'internal'
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS allocation_note text;
CREATE INDEX IF NOT EXISTS supplier_invoices_allocation_idx ON public.supplier_invoices(company_id, allocation);
