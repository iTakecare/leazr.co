-- Ajouter les champs de template PDF par défaut à la table companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_pdf_template_id TEXT DEFAULT 'classic-business',
ADD COLUMN IF NOT EXISTS default_pdf_customizations JSONB DEFAULT '{"showLogo": true, "showFooter": true}'::jsonb;