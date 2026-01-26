-- Ajouter la colonne notified_at sur offer_documents pour tracker les documents déjà notifiés
ALTER TABLE offer_documents ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Ajouter la colonne documents_last_uploaded_at sur offers pour le debounce
ALTER TABLE offers ADD COLUMN IF NOT EXISTS documents_last_uploaded_at TIMESTAMPTZ;