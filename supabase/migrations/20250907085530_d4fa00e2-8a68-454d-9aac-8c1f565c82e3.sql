-- Add new fields to offers table
ALTER TABLE public.offers 
  ADD COLUMN dossier_number TEXT,
  ADD COLUMN source TEXT;

-- Add new fields to contracts table  
ALTER TABLE public.contracts
  ADD COLUMN contract_number TEXT,
  ADD COLUMN dossier_date DATE,
  ADD COLUMN invoice_date DATE,
  ADD COLUMN payment_date DATE,
  ADD COLUMN contract_start_date DATE;

-- Create function to generate offer IDs in format ITC-YYYY-OFF-XXXX
CREATE OR REPLACE FUNCTION generate_offer_id()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    current_year := EXTRACT(year FROM now())::TEXT;
    
    -- Get the highest number for current year
    SELECT COALESCE(
        MAX(
            CAST(
                SPLIT_PART(
                    SPLIT_PART(id, '-', 4), 
                    '', 1
                ) AS INTEGER
            )
        ), 0
    ) + 1
    INTO next_number
    FROM public.offers
    WHERE id LIKE 'ITC-' || current_year || '-OFF-%';
    
    -- Format number with leading zeros (4 digits)
    formatted_number := LPAD(next_number::TEXT, 4, '0');
    
    RETURN 'ITC-' || current_year || '-OFF-' || formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-generate contract_start_date from invoice_date
CREATE OR REPLACE FUNCTION calculate_contract_start_date(invoice_date DATE)
RETURNS DATE AS $$
BEGIN
    IF invoice_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Return first day of the month following invoice_date
    RETURN DATE_TRUNC('month', invoice_date + INTERVAL '1 month')::DATE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate contract_start_date when invoice_date is set
CREATE OR REPLACE FUNCTION update_contract_start_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_date IS NOT NULL AND (OLD.invoice_date IS NULL OR OLD.invoice_date != NEW.invoice_date) THEN
        NEW.contract_start_date := calculate_contract_start_date(NEW.invoice_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contract_start_date
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_start_date();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offers_dossier_number ON public.offers(dossier_number);
CREATE INDEX IF NOT EXISTS idx_offers_source ON public.offers(source);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON public.contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_invoice_date ON public.contracts(invoice_date);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_date ON public.contracts(payment_date);