-- Créer la table category_types pour gérer dynamiquement les types de catégories
CREATE TABLE IF NOT EXISTS category_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  bg_color TEXT DEFAULT 'bg-blue-100',
  text_color TEXT DEFAULT 'text-blue-800',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_category_types_active ON category_types(is_active);
CREATE INDEX IF NOT EXISTS idx_category_types_order ON category_types(display_order);

-- Activer RLS
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;

-- Politique : Lecture publique
CREATE POLICY "category_types_read_all" ON category_types
  FOR SELECT USING (true);

-- Politique : Écriture admin uniquement
CREATE POLICY "category_types_admin_write" ON category_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Migrer les types existants
INSERT INTO category_types (value, label, icon, bg_color, text_color, display_order) VALUES
  ('device', 'Appareil', '📱', 'bg-blue-100', 'text-blue-800', 1),
  ('accessory', 'Accessoire', '🎧', 'bg-green-100', 'text-green-800', 2),
  ('peripheral', 'Périphérique', '🖨️', 'bg-cyan-100', 'text-cyan-800', 3),
  ('software', 'Logiciel', '💾', 'bg-purple-100', 'text-purple-800', 4),
  ('service', 'Service', '🛠️', 'bg-orange-100', 'text-orange-800', 5),
  ('consumable', 'Consommable', '🔋', 'bg-yellow-100', 'text-yellow-800', 6)
ON CONFLICT (value) DO NOTHING;