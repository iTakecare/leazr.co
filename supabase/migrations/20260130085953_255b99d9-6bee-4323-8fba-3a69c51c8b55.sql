-- Ajout des colonnes SEPA sur la table contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS sepa_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS sepa_activated_at timestamptz,
ADD COLUMN IF NOT EXISTS gocardless_billing_request_flow_id text,
ADD COLUMN IF NOT EXISTS gocardless_billing_request_flow_url text;

-- Index pour les recherches par statut SEPA
CREATE INDEX IF NOT EXISTS idx_contracts_sepa_status ON contracts(sepa_status);

-- Mise à jour des contrats existants avec mandat actif
UPDATE contracts 
SET sepa_status = 'active', sepa_activated_at = gocardless_mandate_created_at
WHERE gocardless_mandate_id IS NOT NULL 
  AND gocardless_mandate_status = 'active'
  AND sepa_status IS NULL;

-- Mise à jour des contrats avec mandat en attente
UPDATE contracts 
SET sepa_status = 'pending'
WHERE gocardless_mandate_id IS NULL 
  AND gocardless_billing_request_id IS NOT NULL
  AND gocardless_mandate_status IN ('pending_submission', 'submitted')
  AND sepa_status IS NULL;

-- Mise à jour des contrats avec mandat échoué
UPDATE contracts 
SET sepa_status = 'failed'
WHERE gocardless_mandate_status IN ('failed', 'cancelled', 'expired')
  AND sepa_status IS NULL;