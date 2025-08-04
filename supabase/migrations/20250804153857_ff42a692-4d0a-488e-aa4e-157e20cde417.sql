-- Add default_variant_attributes field to products table
ALTER TABLE products 
ADD COLUMN default_variant_attributes jsonb DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN products.default_variant_attributes IS 'JSON object containing the default variant attributes to pre-select when displaying the product. Example: {"Mémoire vive (RAM)": "16 Go", "Capacité du disque dur": "SSD 512 Go"}';