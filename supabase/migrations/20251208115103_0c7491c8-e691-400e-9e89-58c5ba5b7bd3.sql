-- Supprimer l'ancienne contrainte
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Ajouter la nouvelle contrainte avec les statuts de crédit
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status = ANY (ARRAY[
    'draft'::text, 
    'sent'::text, 
    'paid'::text, 
    'cancelled'::text,
    'credited'::text,
    'partial_credit'::text
  ]));