-- Add is_purchase column to offers table for direct purchase mode
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_purchase BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN offers.is_purchase IS 'If true, this is a direct purchase (no leasing). If false (default), it is a leasing offer.';