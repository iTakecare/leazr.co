-- Phase 1: Système de catégories intelligentes avec upsell automatique

-- 1.1 Créer la table category_types
CREATE TABLE IF NOT EXISTS category_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_types_active ON category_types(is_active);
COMMENT ON TABLE category_types IS 'Types de catégories pour organiser le catalogue (device, accessory, software, service, etc.)';

-- RLS pour category_types (pas de company_id car partagé)
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_types_read_all" ON category_types
  FOR SELECT USING (true);

CREATE POLICY "category_types_admin_write" ON category_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 1.2 Modifier la table categories
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS category_type_id UUID REFERENCES category_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(category_type_id);

-- 1.3 Créer la table category_compatibilities
CREATE TABLE IF NOT EXISTS category_compatibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_category_type_id UUID NOT NULL REFERENCES category_types(id) ON DELETE CASCADE,
  child_category_type_id UUID NOT NULL REFERENCES category_types(id) ON DELETE CASCADE,
  compatibility_strength INTEGER DEFAULT 1,
  is_bidirectional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_type_compatibility UNIQUE(parent_category_type_id, child_category_type_id),
  CONSTRAINT no_self_compatibility CHECK (parent_category_type_id != child_category_type_id)
);

CREATE INDEX IF NOT EXISTS idx_compatibilities_parent ON category_compatibilities(parent_category_type_id);
CREATE INDEX IF NOT EXISTS idx_compatibilities_child ON category_compatibilities(child_category_type_id);
COMMENT ON TABLE category_compatibilities IS 'Compatibilités automatiques entre TYPES de catégories (ex: device → accessory)';

-- RLS pour category_compatibilities
ALTER TABLE category_compatibilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_compatibilities_read_all" ON category_compatibilities
  FOR SELECT USING (true);

CREATE POLICY "category_compatibilities_admin_write" ON category_compatibilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 1.4 Créer la table category_specific_links
CREATE TABLE IF NOT EXISTS category_specific_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  child_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'exception',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_category_link UNIQUE(parent_category_id, child_category_id),
  CONSTRAINT no_self_link CHECK (parent_category_id != child_category_id)
);

CREATE INDEX IF NOT EXISTS idx_specific_links_parent ON category_specific_links(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_specific_links_child ON category_specific_links(child_category_id);
COMMENT ON TABLE category_specific_links IS 'Liens spécifiques entre catégories individuelles (exceptions aux règles de type)';

-- RLS pour category_specific_links (isolation via categories)
ALTER TABLE category_specific_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_specific_links_company_access" ON category_specific_links
  FOR ALL USING (
    parent_category_id IN (
      SELECT id FROM categories WHERE company_id = get_user_company_id()
    )
    OR is_admin_optimized()
  )
  WITH CHECK (
    parent_category_id IN (
      SELECT id FROM categories WHERE company_id = get_user_company_id()
    )
    OR is_admin_optimized()
  );

-- 1.5 Données de démarrage (seed)
INSERT INTO category_types (name, description, display_order) VALUES
  ('device', 'Appareil principal (ordinateur, smartphone, tablette)', 1),
  ('accessory', 'Accessoire compatible (souris, clavier, casque, câbles)', 2),
  ('peripheral', 'Périphérique (imprimante, écran, scanner)', 3),
  ('software', 'Logiciel ou licence', 4),
  ('service', 'Service ou abonnement', 5),
  ('consumable', 'Consommable (cartouches, papier)', 6)
ON CONFLICT (name) DO NOTHING;

-- Compatibilités de base
INSERT INTO category_compatibilities (parent_category_type_id, child_category_type_id, compatibility_strength, is_bidirectional) VALUES
  ((SELECT id FROM category_types WHERE name='device'), (SELECT id FROM category_types WHERE name='accessory'), 3, false),
  ((SELECT id FROM category_types WHERE name='device'), (SELECT id FROM category_types WHERE name='peripheral'), 2, false),
  ((SELECT id FROM category_types WHERE name='device'), (SELECT id FROM category_types WHERE name='software'), 2, false),
  ((SELECT id FROM category_types WHERE name='peripheral'), (SELECT id FROM category_types WHERE name='consumable'), 3, false),
  ((SELECT id FROM category_types WHERE name='device'), (SELECT id FROM category_types WHERE name='service'), 1, false)
ON CONFLICT (parent_category_type_id, child_category_type_id) DO NOTHING;