
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1 NOT NULL;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;

-- Initialiser unit_price depuis purchase_price pour les données existantes
UPDATE stock_items SET unit_price = COALESCE(purchase_price, 0), quantity = 1 WHERE unit_price = 0 OR unit_price IS NULL;
