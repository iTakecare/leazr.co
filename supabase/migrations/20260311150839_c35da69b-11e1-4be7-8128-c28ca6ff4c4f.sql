
-- Delete 115 purchase/expense invoices that were incorrectly imported as 'leasing' type
-- These are vendors like BOL.COM, DocuSign, Amazon, etc. - not actual sales invoices
DELETE FROM invoices 
WHERE integration_type = 'billit' AND invoice_type = 'leasing' 
AND external_invoice_id IS NOT NULL AND contract_id IS NULL
AND (invoice_number NOT LIKE 'ITC-%' OR invoice_number IS NULL);
