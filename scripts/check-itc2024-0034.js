/**
 * check-itc2024-0034.js — Diagnostic ITC-2024-0034
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',
  { auth: { persistSession: false } }
);
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

// Cherche ITC-2024-0034 directement
const { data: inv } = await sb.from('invoices')
  .select('id, invoice_number, invoice_date, offer_id, contract_id, amount, billing_data')
  .eq('company_id', COMPANY_ID)
  .eq('invoice_number', 'ITC-2024-0034')
  .single();

if (inv) {
  console.log('✅ Trouvée :', inv.invoice_number, 'amount:', inv.amount, 'offer_id:', inv.offer_id);
  console.log('   billing_data keys:', inv.billing_data ? Object.keys(inv.billing_data) : 'null');
} else {
  console.log('❌ ITC-2024-0034 absente en DB');
}

// Cherche l'offer dossier 180-22627
const { data: offers } = await sb.from('offers')
  .select('id, status, workflow_status, client_id, amount, remarks')
  .eq('company_id', COMPANY_ID)
  .ilike('remarks', '%180-22627%');

if (offers?.length) {
  console.log('\nOffers avec dossier 180-22627 :');
  for (const o of offers) {
    console.log(`  id=${o.id} | status=${o.status} | amount=${o.amount}`);
    const { data: invs } = await sb.from('invoices')
      .select('id, invoice_number, amount').eq('offer_id', o.id);
    invs?.forEach(i => console.log(`    → facture: ${i.invoice_number} amount=${i.amount}`));
  }
} else {
  console.log('\nAucun offer avec dossier 180-22627 dans remarks');
}

// Cherche contrat avec dossier 180-22627
const { data: contracts } = await sb.from('contracts')
  .select('id, status, leaser_contract_id')
  .eq('company_id', COMPANY_ID)
  .ilike('leaser_contract_id', '%22627%');

if (contracts?.length) {
  console.log('\nContrats dossier 180-22627 :');
  for (const c of contracts) {
    console.log(`  id=${c.id} | leaser_id=${c.leaser_contract_id}`);
    const { data: invs } = await sb.from('invoices')
      .select('id, invoice_number, amount').eq('contract_id', c.id);
    invs?.forEach(i => console.log(`    → facture: ${i.invoice_number} amount=${i.amount}`));
  }
}

// Montant 3913.11 en avril 2024
const { data: byAmount } = await sb.from('invoices')
  .select('id, invoice_number, invoice_date, amount')
  .eq('company_id', COMPANY_ID)
  .gte('invoice_date', '2024-04-01').lte('invoice_date', '2024-05-30')
  .order('invoice_number');

console.log('\nFactures avril-mai 2024 :');
byAmount?.forEach(i => console.log(`  ${i.invoice_number} [${i.invoice_date}] amount=${i.amount}`));
