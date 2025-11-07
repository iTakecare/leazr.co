-- Phase 3: Système d'édition de contenu PDF

-- Créer la table des blocs de contenu PDF
CREATE TABLE IF NOT EXISTS pdf_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL, -- 'cover', 'equipment', 'conditions'
  block_key TEXT NOT NULL, -- 'greeting', 'introduction', 'validity', 'terms', etc.
  content TEXT NOT NULL, -- Contenu HTML éditable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, page_name, block_key)
);

-- Créer un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_pdf_content_blocks_company ON pdf_content_blocks(company_id);
CREATE INDEX IF NOT EXISTS idx_pdf_content_blocks_page ON pdf_content_blocks(company_id, page_name);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_pdf_content_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_pdf_content_blocks_updated_at ON pdf_content_blocks;
CREATE TRIGGER trigger_update_pdf_content_blocks_updated_at
  BEFORE UPDATE ON pdf_content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_content_blocks_updated_at();

-- RLS: Enable Row Level Security
ALTER TABLE pdf_content_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent lire les blocs de leur entreprise
CREATE POLICY "Users can read their company's PDF content blocks"
  ON pdf_content_blocks
  FOR SELECT
  USING (company_id = get_user_company_id());

-- Policy: Les admins peuvent modifier les blocs de leur entreprise
CREATE POLICY "Admins can modify their company's PDF content blocks"
  ON pdf_content_blocks
  FOR ALL
  USING (company_id = get_user_company_id() AND is_admin_optimized())
  WITH CHECK (company_id = get_user_company_id() AND is_admin_optimized());

-- Commentaires pour documenter la table
COMMENT ON TABLE pdf_content_blocks IS 'Blocs de contenu HTML personnalisables pour les PDFs d''offres';
COMMENT ON COLUMN pdf_content_blocks.page_name IS 'Nom de la page: cover, equipment, ou conditions';
COMMENT ON COLUMN pdf_content_blocks.block_key IS 'Clé identifiant le bloc de contenu sur la page';
COMMENT ON COLUMN pdf_content_blocks.content IS 'Contenu HTML éditable du bloc';