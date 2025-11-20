-- Activer RLS sur category_type_compatibilities
ALTER TABLE category_type_compatibilities ENABLE ROW LEVEL SECURITY;

-- Policy de lecture pour tous
CREATE POLICY "category_type_compatibilities_read_all"
  ON category_type_compatibilities
  FOR SELECT
  USING (true);

-- Policy d'écriture pour admins uniquement
CREATE POLICY "category_type_compatibilities_admin_write"
  ON category_type_compatibilities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Recréer la vue sans SECURITY DEFINER
DROP VIEW IF EXISTS categories_with_product_count;

CREATE VIEW categories_with_product_count
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id;