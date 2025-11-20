-- Phase 1: Ajouter la colonne type à categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT;

-- Phase 2: Copier les types existants depuis category_types vers categories
UPDATE categories 
SET type = (SELECT name FROM category_types WHERE id = categories.category_type_id)
WHERE category_type_id IS NOT NULL;

-- Phase 3: Définir une valeur par défaut pour les catégories sans type
UPDATE categories SET type = 'device' WHERE type IS NULL;

-- Phase 4: Rendre la colonne type NOT NULL
ALTER TABLE categories ALTER COLUMN type SET NOT NULL;

-- Phase 5: Supprimer category_type_id de products (on vient de l'ajouter mais on n'en a plus besoin)
ALTER TABLE products DROP COLUMN IF EXISTS category_type_id;

-- Phase 6: Supprimer category_type_id de categories
ALTER TABLE categories DROP COLUMN IF EXISTS category_type_id;

-- Phase 7: Simplifier category_compatibilities pour utiliser des types TEXT directement
-- D'abord, créer une nouvelle table simplifiée
CREATE TABLE IF NOT EXISTS category_type_compatibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL,
  child_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_type, child_type)
);

-- Migrer les données existantes
INSERT INTO category_type_compatibilities (parent_type, child_type)
SELECT DISTINCT 
  (SELECT name FROM category_types WHERE id = cc.parent_category_type_id),
  (SELECT name FROM category_types WHERE id = cc.child_category_type_id)
FROM category_compatibilities cc
ON CONFLICT (parent_type, child_type) DO NOTHING;

-- Phase 8: Supprimer l'ancienne table category_compatibilities
DROP TABLE IF EXISTS category_compatibilities;

-- Phase 9: Supprimer category_types
DROP TABLE IF EXISTS category_types CASCADE;

-- Phase 10: Créer des indexes pour performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_category_type_compatibilities_parent ON category_type_compatibilities(parent_type);
CREATE INDEX IF NOT EXISTS idx_category_type_compatibilities_child ON category_type_compatibilities(child_type);

-- Phase 11: Ajouter des commentaires
COMMENT ON COLUMN categories.type IS 'Type de catégorie (device, accessory, peripheral, software, service, consumable)';
COMMENT ON TABLE category_type_compatibilities IS 'Règles de compatibilité entre types de catégories pour l''upsell intelligent';

-- Phase 12: Créer une vue pour compter les produits par catégorie
CREATE OR REPLACE VIEW categories_with_product_count AS
SELECT 
  c.*,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id;