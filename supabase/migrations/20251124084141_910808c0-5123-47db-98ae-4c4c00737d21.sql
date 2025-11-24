-- Fix security definer view by adding security_invoker option
-- This ensures the view uses the invoking user's permissions rather than the creator's
DROP VIEW IF EXISTS categories_with_product_count;

CREATE VIEW categories_with_product_count
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  c.translation,
  c.description,
  c.company_id,
  c.created_at,
  c.updated_at,
  count(p.id) AS product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name, c.translation, c.description, c.company_id, c.created_at, c.updated_at;