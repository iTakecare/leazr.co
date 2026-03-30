/**
 * diagnose-ventes-directes-2024.js
 *
 * Compare les factures ventes directes 2024 en DB avec la référence.
 * Référence : 19 214,07 € — Dashboard : 19 413,07 € → +199 € en trop
 *
 * Usage :
 *   node scripts/diagnose-ventes-directes-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const REF_TOTAL = 19214.07;
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Factures de référence (tirées du tableau Excel) — numéro : montant PV
const REFERENCE = {
  'ITC-2024-0001': 840.00,
  'ITC-2024-0008': 206.61,
  'ITC-2024-0014': 2890.02,
  'ITC-2024-0015': 206.61,
  'ITC-2024-0022': 199.00,
  'ITC-2024-0023': 199.00,
  'ITC-2024-0024': 199.00,
  'ITC-2024-0025': 199.00,
  'ITC-2024-0026': 199.00,
  'ITC-2024-0027': 206.61,
  'ITC-2024-0032': 192.25,
  'ITC-2024-0041': 199.00,
  'ITC-2024-0042': 842.15,
  'ITC-2024-0046': 407.88,
  'ITC-2024-0047': 199.00,
  'ITC-2024-0048': 199.00,
  'ITC-2024-0052': 895.00,
  'ITC-2024-0053': 425.00,
  'ITC-2024-0058': 199.00,
  'ITC-2024-0059': 507.00,
  'ITC-2024-0060': 270.00,
  'ITC-2024-0061': 350.00,
  'ITC-2024-0062': 370.95,
  'ITC-2024-0065': 199.00,
  'ITC-2024-0066': 199.00,
  'ITC-2024-0067': 199.00,
  'ITC-2024-0069': 270.00,
  'ITC-2024-0072': 833.88,
  'ITC-2024-0075': 949.95,
  'ITC-2024-0076': 199.00,
  'ITC-2024-0077': 199.00,
  'ITC-2024-0078': 199.00,
  'ITC-2024-0079': 199.00,
  'ITC-2024-0087': 199.00,
  'ITC-2024-0088': 661.16,
  'ITC-2024-0091': 199.00,
  'ITC-2024-0092': 199.00,
  'ITC-2024-0093': 199.00,
  'ITC-2024-0094': 199.00,
  'ITC-2024-0095': 199.00,
  'ITC-2024-0096': 199.00,
  'ITC-2024-0097': 199.00,
  'ITC-2024-0098': 199.00,
  'ITC-2024-0099': 398.00,
  'ITC-2024-0100': 199.00,
  'ITC-2024-0101': 199.00,
  'ITC-2024-0102': 199.00,
  'ITC-2024-0113': 1050.00,
  'ITC-2024-0119': 670.00,
  'ITC-2024-0120': 199.00,
};

async function main() {
  console.log('\n🔍 DIAGNOSTIC VENTES DIRECTES 2024\n');
  console.log(`  Référence : ${REF_TOTAL.toFixed(2)} €`);
  console.log(`  Dashboard : 19 413,07 €`);
  console.log(`  Écart     : +199,00 €\n`);

  // Toutes les factures purchase/direct 2024
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, billing_data, invoice_type, integration_type')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'purchase')
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2024-12-31')
    .order('invoice_number');

  if (error) { console.error('❌', error.message); return; }

  console.log(`  ${invoices?.length || 0} factures ventes directes en DB\n`);

  // Comparer avec référence
  const dbMap = {};
  let dbTotal = 0;
  for (const inv of (invoices || [])) {
    dbMap[inv.invoice_number] = inv;
    dbTotal += inv.amount || 0;
  }

  console.log('═══ FACTURES EN DB MAIS PAS DANS RÉFÉRENCE (à supprimer ?) ═══\n');
  let extraTotal = 0;
  for (const inv of (invoices || [])) {
    if (!REFERENCE[inv.invoice_number]) {
      const client = inv.billing_data?.contract_data?.client_name
        || inv.billing_data?.client?.name || '?';
      console.log(`  ❌ ${(inv.invoice_number||'?').padEnd(22)} | ${inv.invoice_date} | ${(inv.amount||0).toFixed(2)}€ | ${client}`);
      extraTotal += inv.amount || 0;
    }
  }
  if (extraTotal === 0) console.log('  (aucune)');
  else console.log(`\n  → Total en trop : ${extraTotal.toFixed(2)} €`);

  console.log('\n═══ FACTURES DANS RÉFÉRENCE MAIS PAS EN DB (à créer ?) ═══\n');
  let missingTotal = 0;
  for (const [num, amount] of Object.entries(REFERENCE)) {
    if (!dbMap[num]) {
      console.log(`  ⚠️  ${num.padEnd(22)} | ${amount.toFixed(2)}€`);
      missingTotal += amount;
    }
  }
  if (missingTotal === 0) console.log('  (aucune)');
  else console.log(`\n  → Total manquant : ${missingTotal.toFixed(2)} €`);

  console.log('\n═══ ÉCARTS DE MONTANT ═══\n');
  let diffCount = 0;
  for (const [num, refAmount] of Object.entries(REFERENCE)) {
    const dbInv = dbMap[num];
    if (!dbInv) continue;
    const dbAmount = dbInv.amount || 0;
    if (Math.abs(dbAmount - refAmount) > 0.01) {
      console.log(`  ⚠️  ${num.padEnd(22)} | DB: ${dbAmount.toFixed(2)}€ | Réf: ${refAmount.toFixed(2)}€ | diff: ${(dbAmount - refAmount).toFixed(2)}€`);
      diffCount++;
    }
  }
  if (diffCount === 0) console.log('  (aucun écart de montant)');

  console.log(`\n  TOTAL DB  : ${dbTotal.toFixed(2)} €`);
  console.log(`  Référence : ${REF_TOTAL.toFixed(2)} €`);
  console.log(`  Écart     : ${(dbTotal - REF_TOTAL).toFixed(2)} €\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
