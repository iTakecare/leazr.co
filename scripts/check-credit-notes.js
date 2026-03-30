/**
 * check-credit-notes.js — vérifie les NC existantes et leur structure
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  // Toutes les credit_notes de l'entreprise
  const { data, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_type, amount, invoice_date, status, integration_type, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'credit_note')
    .order('invoice_date');

  if (error) { console.error('❌', error.message); return; }

  console.log(`\n📋 TOUTES LES NOTES DE CRÉDIT (${data.length})\n`);
  for (const nc of data) {
    console.log(`  ${nc.invoice_number}`);
    console.log(`    amount           : ${nc.amount}€`);
    console.log(`    invoice_date     : ${nc.invoice_date}`);
    console.log(`    status           : ${nc.status}`);
    console.log(`    integration_type : ${nc.integration_type}`);
    console.log(`    offer_id         : ${nc.offer_id || 'null'}`);
    console.log(`    contract_id      : ${nc.contract_id || 'null'}`);
    console.log(`    billing_data     : ${JSON.stringify(nc.billing_data)}`);
    console.log('');
  }

  // Colonnes de la table invoices pour référence
  const { data: sample } = await sb
    .from('invoices')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .limit(1)
    .single();

  if (sample) {
    console.log('  Colonnes disponibles sur invoices :');
    console.log(' ', Object.keys(sample).join(', '));
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
