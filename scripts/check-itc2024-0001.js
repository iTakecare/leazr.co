import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',
  { auth: { persistSession: false } }
);

const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const { data: inv, error } = await sb
  .from('invoices')
  .select('id, invoice_number, invoice_date, offer_id, contract_id, billing_data')
  .eq('company_id', COMPANY_ID)
  .eq('invoice_number', 'ITC-2024-0001')
  .single();

if (error) {
  console.log('Error:', error.message);
  process.exit(1);
}

console.log('── ITC-2024-0001 ──');
console.log('  id:', inv.id);
console.log('  invoice_date:', inv.invoice_date);
console.log('  offer_id:', inv.offer_id || '(null)');
console.log('  contract_id:', inv.contract_id || '(null)');
console.log('  billing_data:', inv.billing_data ? JSON.stringify(inv.billing_data, null, 2) : 'null');

if (inv.offer_id) {
  const { data: offer } = await sb.from('offers')
    .select('id, status, client_id, monthly_installment, total_financed_amount, equipment_description, remarks')
    .eq('id', inv.offer_id).single();
  if (offer) {
    console.log('\n── Offer ──');
    console.log(JSON.stringify(offer, null, 2));
    if (offer.client_id) {
      const { data: cl } = await sb.from('clients')
        .select('id, name, company, email').eq('id', offer.client_id).single();
      if (cl) console.log('\n── Client ──', JSON.stringify(cl));
    }
  }
}

if (inv.contract_id) {
  const { data: ce } = await sb.from('contract_equipment')
    .select('id, title, purchase_price_excl_vat, quantity, serial_number')
    .eq('contract_id', inv.contract_id);
  if (ce?.length) {
    console.log('\n── Contract Equipment ──');
    ce.forEach(r => console.log(' ', JSON.stringify(r)));
  }
}
