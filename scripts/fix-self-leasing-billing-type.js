/**
 * fix-self-leasing-billing-type.js
 *
 * Corrige les factures des contrats self-leasing qui n'ont pas
 * billing_data->>'type' = 'self_leasing_monthly'.
 *
 * Sans ce champ, les factures sont comptées dans CA Leasing au lieu de
 * CA Self-Leasing, et le NOT EXISTS dans self_leasing_by_month empêche
 * aussi le calcul de repli → la mensualité disparaît complètement du tableau.
 *
 * Usage :
 *   node scripts/fix-self-leasing-billing-type.js          → dry-run
 *   node scripts/fix-self-leasing-billing-type.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 FIX SELF-LEASING BILLING TYPE — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // 1. Récupère tous les contrats self-leasing
  const { data: contracts, error: cErr } = await sb
    .from('contracts')
    .select('id, contract_number, client_name')
    .eq('is_self_leasing', true);

  if (cErr) { console.error('❌', cErr.message); return; }
  console.log(`  Contrats self-leasing : ${contracts.length}`);

  const contractIds = contracts.map(c => c.id);
  if (!contractIds.length) { console.log('  Aucun contrat self-leasing.'); return; }

  // 2. Récupère les factures concernées (invoice_type = 'leasing', sans le bon type)
  const { data: invoices, error: iErr } = await sb
    .from('invoices')
    .select('id, invoice_number, amount, invoice_date, contract_id, billing_data')
    .in('contract_id', contractIds)
    .eq('invoice_type', 'leasing');

  if (iErr) { console.error('❌', iErr.message); return; }

  const toFix = invoices.filter(i => i.billing_data?.type !== 'self_leasing_monthly');
  const alreadyOk = invoices.length - toFix.length;

  console.log(`  Factures leasing liées : ${invoices.length}`);
  console.log(`  Déjà correctes         : ${alreadyOk}`);
  console.log(`  À corriger             : ${toFix.length}\n`);

  if (!toFix.length) {
    console.log('  ✅ Aucune correction nécessaire.\n');
    return;
  }

  // Affiche les factures à corriger
  for (const inv of toFix) {
    const contract = contracts.find(c => c.id === inv.contract_id);
    console.log(`  📄 ${(inv.invoice_number || inv.id).padEnd(30)} ${String(inv.amount + '€').padStart(10)}  ${inv.invoice_date}  → ${contract?.client_name || '?'}`);
  }

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour corriger\n');
    return;
  }

  // 3. Applique la correction
  let ok = 0;
  let ko = 0;
  for (const inv of toFix) {
    const newBillingData = {
      ...(inv.billing_data || {}),
      type: 'self_leasing_monthly',
    };
    const { error: uErr } = await sb
      .from('invoices')
      .update({ billing_data: newBillingData })
      .eq('id', inv.id);

    if (uErr) {
      console.error(`  ❌ ${inv.invoice_number} : ${uErr.message}`);
      ko++;
    } else {
      console.log(`  ✅ ${inv.invoice_number} corrigée`);
      ok++;
    }
  }

  console.log(`\n  Résultat : ${ok} corrigée(s), ${ko} erreur(s)\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
