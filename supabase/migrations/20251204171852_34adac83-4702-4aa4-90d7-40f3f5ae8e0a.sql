-- Ajouter la colonne pour tracker la dernière consultation des documents
ALTER TABLE offers ADD COLUMN IF NOT EXISTS documents_last_viewed_at TIMESTAMPTZ;