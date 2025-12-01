-- Ajouter la colonne invoice_date à la table invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;

-- Initialiser invoice_date avec created_at pour les factures existantes
UPDATE invoices SET invoice_date = DATE(created_at) WHERE invoice_date IS NULL;