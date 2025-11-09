-- Add product_id column to offer_equipment table to link with catalog products
ALTER TABLE offer_equipment 
ADD COLUMN product_id UUID REFERENCES products(id);

-- Create index for better performance on product_id lookups
CREATE INDEX IF NOT EXISTS idx_offer_equipment_product_id 
ON offer_equipment(product_id);

-- Add comment to document the column
COMMENT ON COLUMN offer_equipment.product_id IS 'Link to the product in the catalog for retrieving images and additional data';