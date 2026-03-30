/**
 * diagnose-direct-sales-billing-2024.js
 *
 * Trouve toutes les factures ITC-2024 qui ne sont PAS dans les PDFs Grenke
 * (= ventes directes / non-leasing) et vérifie leur état billing_data.
 *
 * Usage: node scripts/diagnose-direct-sales-billing-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

// Les factures Grenke traitées par update-billing-data-2024.js
const GRENKE_INVOICES = new Set([
  'ITC-2024-0002','ITC-2024-0003','ITC-2024-0004','ITC-2024-0005','ITC-2024-0006',
  'ITC-2024-0007','ITC-2024-0009','ITC-2024-0010','ITC-2024-0011','ITC-2024-0012',
  'ITC-2024-0013','ITC-2024-0016','ITC-2024-0017','ITC-2024-0018','ITC-2024-0019',
  'ITC-2024-0020','ITC-2024-0021','ITC-2024-0028','ITC-2024-0029','ITC-2024-0030',
  'ITC-2024-0031','ITC-2024-0033','ITC-2024-0034','ITC-2024-0035','ITC-2024-0036',
  'ITC-2024-0037','ITC-2024-0038','ITC-2024-0039','ITC-2024-0040','ITC-2024-0043',
  'ITC-2024-0044','ITC-2024-0045','ITC-2024-0049','ITC-2024-0050','ITC-2024-0055',
  'ITC-2024-0056','ITC-2024-0057','ITC-2024-0063','ITC-2024-0064','ITC-2024-0068',
  'ITC-2024-0070','ITC-2024-0071','ITC-2024-0073','ITC-2024-0074','ITC-2024-0080',
  'ITC-2024-0081','ITC-2024-0082','ITC-2024-0083','ITC-2024-0084','ITC-2024-0085',
  'ITC-2024-0086','ITC-2024-0089','ITC-2024-0090','ITC-2024-0104','ITC-2024-0108',
  'ITC-2024-0109','ITC-2024-0110','ITC-2024-0111','ITC-2024-0112','ITC-2024-0114',
  'ITC-2024-0115','ITC-2024-0116','ITC-2024-0117','ITC-2024-0121',
]);

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC VENTES DIRECTES 2024\n');

  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .like('invoice_number', 'ITC-2024-%')
    .order('invoice_number');

  if (error) { console.error('❌', error.message); return; }

  const directSales = invoices.filter(i => !GRENKE_INVOICES.has(i.invoice_number));

  console.log(`  Total ITC-2024-* en DB : ${invoices.length}`);
  console.log(`  Dont Grenke (leasing)  : ${invoices.length - directSales.length}`);
  console.log(`  Ventes directes        : ${directSales.length}\n`);

  const withBilling    = directSales.filter(i => i.billing_data && i.billing_data.equipment_data?.length > 0);
  const withoutBilling = directSales.filter(i => !i.billing_data || !i.billing_data.equipment_data?.length);

  console.log(`  ✅ Avec billing_data complet  : ${withBilling.length}`);
  console.log(`  ❌ Sans billing_data/équipement: ${withoutBilling.length}\n`);

  if (withoutBilling.length) {
    console.log('── À corriger ────────────────────────────────────────');
    for (const inv of withoutBilling) {
      const hasBd   = !!inv.billing_data;
      const hasEq   = !!inv.billing_data?.equipment_data?.length;
      const status  = !hasBd ? 'no billing_data' : !hasEq ? 'no equipment_data' : 'empty equipment_data';
      console.log(`  ${inv.invoice_number}  [${inv.invoice_date}]  → ${status}`);
    }
  }

  if (withBilling.length) {
    console.log('\n── Déjà remplis ──────────────────────────────────────');
    for (const inv of withBilling) {
      const eq = inv.billing_data.equipment_data;
      console.log(`  ${inv.invoice_number}  → ${eq.length} équipement(s) : ${eq.map(e => e.title).join(', ')}`);
    }
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
