/**
 * diagnose-april-2024.js
 * Liste toutes les factures leasing d'avril 2024 pour identifier l'écart de 12,265.31€
 * (= ITC-2024-0034 + ITC-2024-0038 attendus mais pas encore leurs NC)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n📋 FACTURES LEASING AVRIL 2024\n');

  const { data, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_type, amount, status, invoice_date, leaser_name, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2024-04-01')
    .lte('invoice_date', '2024-04-30')
    .order('invoice_date', { ascending: true });

  if (error) { console.error('❌', error.message); return; }

  console.log(`  ${data.length} factures en avril 2024 :\n`);

  let total = 0;
  for (const inv of data) {
    const amt = parseFloat(inv.amount) || 0;
    total += amt;
    const clientName = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client_data?.company
      || inv.billing_data?.client_data?.name
      || '';
    const sign = amt < 0 ? '🔴' : '🟢';
    console.log(`  ${sign} ${(inv.invoice_number||'?').padEnd(20)} ${inv.invoice_type.padEnd(12)} ${String(amt.toFixed(2)+'€').padStart(12)}  ${clientName.padEnd(35)} ${inv.leaser_name||''}`);
  }

  console.log(`\n  TOTAL AVRIL : ${total.toFixed(2)}€`);
  console.log(`  Référence   : 32,889.56€`);
  console.log(`  Écart       : ${(total - 32889.56).toFixed(2)}€\n`);

  // Recherche spécifique des montants suspects
  console.log('\n🔍 RECHERCHE PAR MONTANT (3913.11 ou 8352.20)');
  const suspect = data.filter(i => {
    const a = Math.abs(parseFloat(i.amount)||0);
    return Math.abs(a - 3913.11) < 0.05 || Math.abs(a - 8352.20) < 0.05;
  });
  if (suspect.length) {
    suspect.forEach(i => console.log(`  → ${i.invoice_number} | ${i.invoice_type} | ${i.amount}€`));
  } else {
    console.log('  Aucun montant exact trouvé — vérification élargie...');

    // Cherche toutes factures ~12265€ total
    const { data: all, error: e2 } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_type, amount, invoice_date')
      .eq('company_id', COMPANY_ID)
      .ilike('invoice_number', 'ITC-2024-003%');
    if (!e2 && all.length) {
      console.log('\n  Factures ITC-2024-003* dans la DB :');
      all.forEach(i => console.log(`    ${i.invoice_number} | ${i.invoice_type} | ${i.amount}€ | ${i.invoice_date}`));
    } else {
      console.log('  Aucune ITC-2024-003x trouvée non plus.');
    }
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
