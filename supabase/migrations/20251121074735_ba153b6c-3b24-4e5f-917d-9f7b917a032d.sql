-- Create view to get categories with product counts
CREATE OR REPLACE VIEW categories_with_product_count AS
SELECT 
  c.id,
  c.name,
  c.translation,
  c.description,
  c.company_id,
  c.created_at,
  c.updated_at,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name, c.translation, c.description, c.company_id, c.created_at, c.updated_at;