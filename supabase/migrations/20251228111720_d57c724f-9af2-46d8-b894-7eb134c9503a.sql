-- Add lessor signature fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS signature_representative_name TEXT,
ADD COLUMN IF NOT EXISTS signature_representative_title TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.signature_url IS 'URL of the lessor representative signature image for PDF contracts';
COMMENT ON COLUMN public.companies.signature_representative_name IS 'Name of the legal representative who signs contracts';
COMMENT ON COLUMN public.companies.signature_representative_title IS 'Title/role of the legal representative (e.g., Administrateur délégué)';