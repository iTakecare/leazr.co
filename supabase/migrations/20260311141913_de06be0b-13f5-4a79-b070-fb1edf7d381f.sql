ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_source_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_source_check 
CHECK (
  contract_id IS NOT NULL 
  OR offer_id IS NOT NULL 
  OR integration_type IS NOT NULL
);