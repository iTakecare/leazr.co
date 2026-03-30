/**
 * inspect-billing-data.js
 * Inspecte la structure billing_data d'une facture 2023 (référence)
 * et d'une facture 2024 vide pour comparer.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function inspectInvoice(label, invoiceNumber) {
  const { data: inv } = await sb
    .from('invoices')
    .select('id, invoice_number, billing_data, offer_id, contract_id')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', invoiceNumber)
    .single();

  if (!inv) { console.log(`\n❌ ${label}: ${invoiceNumber} introuvable`); return; }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📄 ${label}: ${invoiceNumber}`);
  console.log(`   offer_id=${inv.offer_id||'(null)'} | contract_id=${inv.contract_id||'(null)'}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(JSON.stringify(inv.billing_data, null, 2));
}

async function main() {
  // Facture 2023 de référence (bien remplie)
  await inspectInvoice('2023 référence', 'ITC-2023-0001');
  await inspectInvoice('2023 référence', 'ITC-2023-0010');

  // Factures 2024 vides
  await inspectInvoice('2024 vide', 'ITC-2024-0090');
  await inspectInvoice('2024 vide', 'ITC-2024-0002');
  await inspectInvoice('2024 vide', 'ITC-2024-0080');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
