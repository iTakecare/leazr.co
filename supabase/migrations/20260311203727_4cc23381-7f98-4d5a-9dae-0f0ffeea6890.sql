
-- Restore purchase invoices for all offers with is_purchase=true and workflow_status='invoicing'
-- that don't already have an invoice linked
INSERT INTO invoices (
  offer_id,
  company_id,
  leaser_name,
  invoice_type,
  amount,
  status,
  integration_type,
  invoice_date,
  billing_data
)
SELECT
  o.id as offer_id,
  o.company_id,
  '' as leaser_name,
  'purchase' as invoice_type,
  COALESCE(
    (SELECT SUM(
      COALESCE(oe.selling_price, oe.purchase_price * (1 + COALESCE(oe.margin, 0) / 100)) * COALESCE(oe.quantity, 1)
    ) FROM offer_equipment oe WHERE oe.offer_id = o.id),
    o.amount,
    0
  ) as amount,
  'draft' as status,
  'local' as integration_type,
  COALESCE(o.created_at::date, CURRENT_DATE) as invoice_date,
  jsonb_build_object(
    'offer_data', jsonb_build_object(
      'id', o.id,
      'created_at', o.created_at,
      'is_purchase', true
    ),
    'client_data', jsonb_build_object(
      'name', COALESCE(c.name, o.client_name),
      'company', c.company,
      'email', COALESCE(c.email, o.client_email),
      'phone', c.phone,
      'address', COALESCE(c.billing_address, c.address),
      'city', COALESCE(c.billing_city, c.city),
      'postal_code', COALESCE(c.billing_postal_code, c.postal_code),
      'country', COALESCE(c.billing_country, c.country, 'Belgique'),
      'vat_number', c.vat_number
    ),
    'invoice_totals', jsonb_build_object(
      'total_excl_vat', COALESCE(
        (SELECT SUM(
          COALESCE(oe2.selling_price, oe2.purchase_price * (1 + COALESCE(oe2.margin, 0) / 100)) * COALESCE(oe2.quantity, 1)
        ) FROM offer_equipment oe2 WHERE oe2.offer_id = o.id),
        o.amount, 0
      ),
      'vat_amount', COALESCE(
        (SELECT SUM(
          COALESCE(oe3.selling_price, oe3.purchase_price * (1 + COALESCE(oe3.margin, 0) / 100)) * COALESCE(oe3.quantity, 1)
        ) FROM offer_equipment oe3 WHERE oe3.offer_id = o.id),
        o.amount, 0
      ) * 0.21,
      'total_incl_vat', COALESCE(
        (SELECT SUM(
          COALESCE(oe4.selling_price, oe4.purchase_price * (1 + COALESCE(oe4.margin, 0) / 100)) * COALESCE(oe4.quantity, 1)
        ) FROM offer_equipment oe4 WHERE oe4.offer_id = o.id),
        o.amount, 0
      ) * 1.21
    ),
    'generated_from_purchase_offer', true,
    'restored', true,
    'created_at', now()::text
  ) as billing_data
FROM offers o
LEFT JOIN clients c ON c.id = o.client_id
WHERE o.is_purchase = true
  AND o.workflow_status = 'invoicing'
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.offer_id = o.id AND i.company_id = o.company_id
  );
