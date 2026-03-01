
-- Ajout des attributs dédiés et conversion serial_number en tableau
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS cpu text;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS memory text;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS storage text;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS grade text;

-- Ajouter un champ tableau pour les N° de série multiples
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS serial_numbers text[] DEFAULT '{}';

-- Migrer les serial_number existants vers le tableau
UPDATE stock_items 
SET serial_numbers = ARRAY[serial_number] 
WHERE serial_number IS NOT NULL AND serial_number != '' AND (serial_numbers IS NULL OR serial_numbers = '{}');
