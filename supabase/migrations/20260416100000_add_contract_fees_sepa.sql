-- Migration: Add SEPA fee payment columns to contracts table
-- Enables one-time dossier fees and annual insurance fee direct debits

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS fees_customer_id       text,
  ADD COLUMN IF NOT EXISTS fees_mandate_id        text,
  ADD COLUMN IF NOT EXISTS fees_iban              text,
  ADD COLUMN IF NOT EXISTS fees_bic               text,

  -- Frais de dossier (one-time)
  ADD COLUMN IF NOT EXISTS dossier_fee_amount     numeric,
  ADD COLUMN IF NOT EXISTS dossier_fee_status     text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dossier_fee_mollie_id  text,
  ADD COLUMN IF NOT EXISTS dossier_fee_paid_at    timestamptz,

  -- Frais d'assurance annuelle (recurring)
  ADD COLUMN IF NOT EXISTS insurance_fee_amount   numeric,
  ADD COLUMN IF NOT EXISTS insurance_fee_active   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_fee_mollie_id text,
  ADD COLUMN IF NOT EXISTS insurance_fee_next_date date;

COMMENT ON COLUMN contracts.fees_customer_id      IS 'Mollie customer ID used for fee payments (may differ from self-leasing customer)';
COMMENT ON COLUMN contracts.fees_mandate_id       IS 'Mollie mandate ID for fee payments';
COMMENT ON COLUMN contracts.fees_iban             IS 'IBAN used for fee prélèvements';
COMMENT ON COLUMN contracts.dossier_fee_amount    IS 'One-time dossier fee amount (€)';
COMMENT ON COLUMN contracts.dossier_fee_status    IS 'none | pending | paid | failed';
COMMENT ON COLUMN contracts.dossier_fee_mollie_id IS 'Mollie payment ID for the dossier fee';
COMMENT ON COLUMN contracts.insurance_fee_amount  IS 'Annual insurance fee amount (€/year)';
COMMENT ON COLUMN contracts.insurance_fee_active  IS 'Whether annual insurance subscription is active';
COMMENT ON COLUMN contracts.insurance_fee_mollie_id IS 'Mollie subscription ID for annual insurance';
COMMENT ON COLUMN contracts.insurance_fee_next_date IS 'Next scheduled insurance payment date';
