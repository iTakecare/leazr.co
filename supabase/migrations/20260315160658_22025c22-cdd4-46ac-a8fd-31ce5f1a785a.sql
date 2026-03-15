-- Create a function to normalize VAT numbers in PostgreSQL
CREATE OR REPLACE FUNCTION public.normalize_vat_number(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  prefix text;
  digits text;
BEGIN
  IF raw IS NULL OR raw = '' THEN
    RETURN raw;
  END IF;
  
  -- Remove all separators: dots, dashes, spaces, colons
  cleaned := upper(regexp_replace(raw, '[\s.\-:]', '', 'g'));
  
  -- Check if starts with 2-letter country prefix
  IF cleaned ~ '^[A-Z]{2}\d+$' THEN
    prefix := substring(cleaned from 1 for 2);
    digits := substring(cleaned from 3);
  ELSE
    prefix := 'BE';
    digits := cleaned;
  END IF;
  
  -- Pad Belgian numbers to 10 digits
  IF prefix = 'BE' AND length(digits) = 9 THEN
    digits := '0' || digits;
  END IF;
  
  RETURN prefix || digits;
END;
$$;

-- Normalize all existing vat_number entries
UPDATE clients 
SET vat_number = normalize_vat_number(vat_number)
WHERE vat_number IS NOT NULL 
  AND vat_number != ''
  AND vat_number != normalize_vat_number(vat_number);