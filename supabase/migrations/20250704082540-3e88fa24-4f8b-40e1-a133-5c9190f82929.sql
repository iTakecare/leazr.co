-- Add company_name field to leasers table
ALTER TABLE public.leasers ADD COLUMN company_name TEXT;

-- Update existing data with company names extracted from names
-- For Grenke example: "1. Grenke Lease SRL" -> company_name = "Grenke"
UPDATE public.leasers 
SET company_name = CASE 
  WHEN name ILIKE '%grenke%' THEN 'Grenke'
  WHEN name ILIKE '%bnp%' THEN 'BNP'
  WHEN name ILIKE '%ing%' THEN 'ING'
  WHEN name ILIKE '%kbc%' THEN 'KBC'
  WHEN name ILIKE '%belfius%' THEN 'Belfius'
  -- For other leasers, extract the main name part (remove numbering and legal forms)
  ELSE regexp_replace(
    regexp_replace(name, '^[0-9]+\.\s*', ''), -- Remove number prefix
    '\s+(SRL|SA|SPRL|NV|BV|Ltd|LLC|Inc).*$', '', 'i' -- Remove legal forms at end
  )
END
WHERE company_name IS NULL;