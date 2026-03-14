
-- 1. Synchronize brand_name from brands table
UPDATE products p
SET brand_name = b.name
FROM brands b
WHERE p.brand_id = b.id
  AND (p.brand_name IS NULL OR p.brand_name = '' OR p.brand_name = 'Generic' OR p.brand_name = 'Non spécifié');

-- 2. Synchronize category_name from categories table
UPDATE products p
SET category_name = c.name
FROM categories c
WHERE p.category_id = c.id
  AND (p.category_name IS NULL OR p.category_name = '' OR p.category_name = 'Generic' OR p.category_name = 'Non spécifié');

-- 3. Create trigger to auto-sync brand_name and category_name on INSERT/UPDATE
CREATE OR REPLACE FUNCTION sync_product_denormalized_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync brand_name when brand_id changes
  IF NEW.brand_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.brand_id IS DISTINCT FROM NEW.brand_id) THEN
    SELECT name INTO NEW.brand_name FROM brands WHERE id = NEW.brand_id;
  END IF;

  -- Sync category_name when category_id changes
  IF NEW.category_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.category_id IS DISTINCT FROM NEW.category_id) THEN
    SELECT name INTO NEW.category_name FROM categories WHERE id = NEW.category_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_names ON products;
CREATE TRIGGER trg_sync_product_names
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_denormalized_names();
