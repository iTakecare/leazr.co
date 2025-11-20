-- Créer la table product_upsells pour gérer les upsells manuels
CREATE TABLE IF NOT EXISTS product_upsells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  upsell_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' ou 'auto'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, upsell_product_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_upsells_product_id ON product_upsells(product_id);
CREATE INDEX IF NOT EXISTS idx_product_upsells_upsell_product_id ON product_upsells(upsell_product_id);

-- RLS policies
ALTER TABLE product_upsells ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "product_upsells_select_public" ON product_upsells
  FOR SELECT USING (true);

-- Insertion/modification/suppression pour admins uniquement
CREATE POLICY "product_upsells_insert_admin" ON product_upsells
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "product_upsells_update_admin" ON product_upsells
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "product_upsells_delete_admin" ON product_upsells
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_product_upsells_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_product_upsells_updated_at_trigger ON product_upsells;
CREATE TRIGGER update_product_upsells_updated_at_trigger
  BEFORE UPDATE ON product_upsells
  FOR EACH ROW
  EXECUTE FUNCTION update_product_upsells_updated_at();