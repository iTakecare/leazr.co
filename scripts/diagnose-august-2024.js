/**
 * diagnose-august-2024.js
 *
 * Compare les factures leasing d'août 2024 en DB avec la référence.
 * Référence : 9 211,57 € — Dashboard : 7 454,70 € → écart 1 756,87 €
 *
 * Usage :
 *   node scripts/diagnose-august-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const REF_AUGUST = 9211.57;
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC AOÛT 2024 — CA Leasing\n');
  console.log(`  Référence : ${REF_AUGUST.toFixed(2)} €`);
  console.log(`  Dashboard : 7 454,70 €`);
  console.log(`  Écart     : -1 756,87 €\n`);

  // 1. Factures leasing août 2024 (invoice_type = leasing, integration_type != mollie)
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, billing_data, credit_note_id, credited_amount, invoice_type, integration_type')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .neq('integration_type', 'mollie')
    .gte('invoice_date', '2024-08-01')
    .lte('invoice_date', '2024-08-31')
    .order('invoice_date');

  if (error) { console.error('❌', error.message); return; }

  console.log(`═══ FACTURES LEASING AOÛT 2024 EN DB (${invoices?.length || 0}) ═══\n`);

  let total = 0;
  for (const inv of (invoices || [])) {
    const amount = inv.amount || 0;
    const client = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client?.name
      || '?';
    const nc = inv.credit_note_id ? ` [NC: ${inv.credited_amount}€]` : '';
    console.log(`  ${(inv.invoice_number || inv.id.slice(0,8)).padEnd(20)} | ${inv.invoice_date} | ${amount.toFixed(2).padStart(10)}€ | ${client}${nc}`);
    total += amount;
  }

  console.log(`\n  TOTAL DB  : ${total.toFixed(2)} €`);
  console.log(`  Référence : ${REF_AUGUST.toFixed(2)} €`);
  console.log(`  Écart     : ${(total - REF_AUGUST).toFixed(2)} €\n`);

  // 2. Cherche aussi dans juillet/septembre les factures mal datées
  console.log('═══ FACTURES LEASING PROCHES (juillet + septembre 2024) ═══\n');

  const { data: nearby } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, billing_data, invoice_type, integration_type')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .neq('integration_type', 'mollie')
    .or('and(invoice_date.gte.2024-07-01,invoice_date.lte.2024-07-31),and(invoice_date.gte.2024-09-01,invoice_date.lte.2024-09-30)')
    .order('invoice_date');

  for (const inv of (nearby || [])) {
    const amount = inv.amount || 0;
    const client = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client?.name
      || '?';
    console.log(`  ${(inv.invoice_number || inv.id.slice(0,8)).padEnd(20)} | ${inv.invoice_date} | ${amount.toFixed(2).padStart(10)}€ | ${client}`);
  }

  // 3. Cherche les imports manifest pour août 2024
  console.log('\n═══ VÉRIFICATION DANS LES MANIFESTS D\'IMPORT ═══\n');
  console.log('  → Vérifier import-manifest-2024.json pour les entrées avec invoice_date en août 2024\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
