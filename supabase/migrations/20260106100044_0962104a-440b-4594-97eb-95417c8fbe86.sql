-- Add pack_id column to offers table to track which pack was used
ALTER TABLE offers ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES product_packs(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_offers_pack_id ON offers(pack_id);