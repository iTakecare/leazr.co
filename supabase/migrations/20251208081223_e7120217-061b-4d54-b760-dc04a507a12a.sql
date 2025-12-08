-- Ajouter une colonne invoice_type pour différencier factures d'achat et de leasing
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'leasing';

-- Mettre à jour les factures existantes qui viennent d'offres d'achat (pas de contrat)
UPDATE invoices SET invoice_type = 'purchase' WHERE offer_id IS NOT NULL AND contract_id IS NULL;