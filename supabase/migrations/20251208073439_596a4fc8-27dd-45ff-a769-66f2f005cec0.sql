-- Rendre contract_id nullable pour permettre les factures d'achat (sans contrat)
ALTER TABLE invoices ALTER COLUMN contract_id DROP NOT NULL;

-- Ajouter une contrainte pour s'assurer qu'une facture a toujours une source (contrat OU offre)
ALTER TABLE invoices ADD CONSTRAINT invoices_source_check 
CHECK (contract_id IS NOT NULL OR offer_id IS NOT NULL);