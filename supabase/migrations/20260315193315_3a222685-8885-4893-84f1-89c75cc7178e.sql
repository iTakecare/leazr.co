ALTER TABLE synced_emails DROP COLUMN IF EXISTS linked_client_id;
ALTER TABLE synced_emails ADD COLUMN IF NOT EXISTS linked_offer_id uuid REFERENCES offers(id);
ALTER TABLE synced_emails ADD COLUMN IF NOT EXISTS linked_contract_id uuid REFERENCES contracts(id);