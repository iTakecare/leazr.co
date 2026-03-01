
-- Corriger la facture de Frederic Veillard qui a amount TVAC au lieu de HTVA
UPDATE invoices 
SET amount = 55.95,
    billing_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          billing_data,
          '{invoice_totals,total_excl_vat}', '55.95'
        ),
        '{invoice_totals,vat_amount}', '11.75'
      ),
      '{invoice_totals,total_incl_vat}', '67.70'
    )
WHERE id = '9515bdcf-e79b-4249-a2eb-1419cb898253';
