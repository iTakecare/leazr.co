-- Ajouter le champ category_type_id à la table products
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category_type_id UUID REFERENCES category_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_type ON products(category_type_id);

COMMENT ON COLUMN products.category_type_id IS 'Type de catégorie pour l''upsell intelligent (peut être différent de celui de la catégorie parent)';