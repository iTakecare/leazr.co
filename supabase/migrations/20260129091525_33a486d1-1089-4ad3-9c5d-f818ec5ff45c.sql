-- Ajout des colonnes GoCardless à la table contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_customer_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_subscription_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_status TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_created_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_billing_request_id TEXT;

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_contracts_gocardless_mandate_id ON contracts(gocardless_mandate_id) WHERE gocardless_mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_gocardless_customer_id ON contracts(gocardless_customer_id) WHERE gocardless_customer_id IS NOT NULL;