-- Corriger les factures importées existantes avec les données manquantes
UPDATE invoices i
SET billing_data = jsonb_build_object(
  'contract_data', jsonb_build_object(
    'id', c.id,
    'offer_id', c.offer_id,
    'tracking_number', COALESCE(c.tracking_number, ''),
    'client_name', COALESCE(cl.name, c.client_name, ''),
    'client_email', COALESCE(cl.email, c.client_email, ''),
    'status', COALESCE(c.status, ''),
    'created_at', COALESCE(c.created_at::text, ''),
    'monthly_payment', COALESCE((i.billing_data::jsonb -> 'contract_data' ->> 'monthly_payment')::numeric, c.monthly_payment, 0)
  ),
  'client_data', jsonb_build_object(
    'name', COALESCE(cl.name, c.client_name, ''),
    'company', COALESCE(cl.company, ''),
    'email', COALESCE(cl.email, c.client_email, ''),
    'phone', COALESCE(cl.phone, ''),
    'address', COALESCE(cl.address, ''),
    'city', COALESCE(cl.city, ''),
    'postal_code', COALESCE(cl.postal_code, ''),
    'country', COALESCE(cl.country, 'Belgique'),
    'vat_number', COALESCE(cl.vat_number, '')
  ),
  'offer_data', jsonb_build_object(
    'id', COALESCE(c.offer_id::text, ''),
    'tracking_number', COALESCE(c.tracking_number, '')
  ),
  'equipment_data', COALESCE(i.billing_data::jsonb -> 'equipment_data', '[]'::jsonb),
  'leaser_data', CASE 
    WHEN l.id IS NOT NULL THEN jsonb_build_object(
      'name', COALESCE(l.company_name, l.name, ''),
      'address', COALESCE(l.address, ''),
      'city', COALESCE(l.city, ''),
      'postal_code', COALESCE(l.postal_code, ''),
      'country', COALESCE(l.country, 'Belgique'),
      'vat_number', COALESCE(l.vat_number, ''),
      'email', COALESCE(l.email, ''),
      'phone', COALESCE(l.phone, '')
    )
    ELSE i.billing_data::jsonb -> 'leaser_data'
  END,
  'invoice_totals', COALESCE(i.billing_data::jsonb -> 'invoice_totals', jsonb_build_object(
    'total_excl_vat', i.amount,
    'vat_amount', i.amount * 0.21,
    'total_incl_vat', i.amount * 1.21
  )),
  'imported_from_csv', true,
  'created_at', COALESCE(i.billing_data::jsonb ->> 'created_at', i.created_at::text)
)
FROM contracts c
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN leasers l ON c.leaser_id = l.id
WHERE i.contract_id = c.id
  AND i.billing_data IS NOT NULL
  AND (i.billing_data::jsonb ->> 'imported_from_csv')::boolean = true;