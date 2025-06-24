
-- Ajouter les colonnes de branding à la table companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#64748b',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Mettre à jour la colonne logo_url si elle n'existe pas déjà
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS logo_url TEXT;
