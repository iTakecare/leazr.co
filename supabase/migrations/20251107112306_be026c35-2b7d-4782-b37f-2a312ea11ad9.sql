-- Add offer_number column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_number TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_offers_offer_number ON offers(offer_number);

-- Create function to generate offer number automatically
CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.offer_number IS NULL THEN
    NEW.offer_number := 'OFF-' || 
                        EXTRACT(YEAR FROM NEW.created_at)::TEXT || '-' ||
                        UPPER(SUBSTRING(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate offer number on insert
DROP TRIGGER IF EXISTS set_offer_number ON offers;
CREATE TRIGGER set_offer_number
BEFORE INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION generate_offer_number();

-- Update existing offers without offer_number
UPDATE offers
SET offer_number = 'OFF-' || 
                   EXTRACT(YEAR FROM created_at)::TEXT || '-' ||
                   UPPER(SUBSTRING(id::text, 1, 8))
WHERE offer_number IS NULL;