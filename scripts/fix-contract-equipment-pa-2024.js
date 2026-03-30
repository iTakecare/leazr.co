/**
 * fix-contract-equipment-pa-2024.js
 *
 * Corrige les 31 contrats 2024 dont le PA en DB ne correspond pas
 * au tableau de référence CSV.
 *
 * Pour chaque contrat discordant :
 *   1. Supprime les lignes contract_equipment existantes
 *   2. Insère une ligne unique avec le PA correct (source: CSV 2024-Tableau_1.csv)
 *
 * Les 30 contrats corrects ne sont pas touchés.
 *
 * Usage :
 *   node scripts/fix-contract-equipment-pa-2024.js --dry-run
 *   node scripts/fix-contract-equipment-pa-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// PA correct par invoice_number (source: 2024-Tableau_1.csv) — uniquement les discordants
const CORRECT_PA = {
  'ITC-2024-0003':  1724.82,
  'ITC-2024-0004':  1112.32,
  'ITC-2024-0005':  4638.80,
  'ITC-2024-0007':   700.42,
  'ITC-2024-0010':  6008.71,
  'ITC-2024-0011':  1384.00,
  'ITC-2024-0013':  1716.65,
  'ITC-2024-0017': 19737.80,
  'ITC-2024-0019':   670.50,
  'ITC-2024-0020':  1800.00,
  'ITC-2024-0028':  7141.20,
  'ITC-2024-0033':  1886.15,
  'ITC-2024-0035':   665.88,
  'ITC-2024-0039':  2592.00,
  'ITC-2024-0045':   875.00,
  'ITC-2024-0055':  2163.82,
  'ITC-2024-0057':  9230.88,
  'ITC-2024-0064':   880.00,
  'ITC-2024-0070':  6018.50,
  'ITC-2024-0071':   696.00,
  'ITC-2024-0086':   575.00,
  'ITC-2024-0110':  1494.00,
  'ITC-2024-0111':  5150.01,
  'ITC-2024-0112':  1847.00,
  'ITC-2024-0114': 15021.52,
  'ITC-2024-0115':  2340.00,
  'ITC-2024-0117':  3358.16,
  'ITC-2024-0121':  1167.00,
  // Écarts minimes mais présents :
  'ITC-2024-0050':  1398.76,
  'ITC-2024-0068':   632.16,
  'ITC-2024-0089':  1361.64,
};

async function main() {
  console.log(`\n🔧 FIX CONTRACT_EQUIPMENT PA 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}\n`);
  console.log(`  ${Object.keys(CORRECT_PA).length} contrats à corriger\n`);

  // Récupérer les factures 2024 pour ces invoice_numbers
  const invoiceNumbers = Object.keys(CORRECT_PA);
  const { data: invoices } = await sb
    .from('invoices')
    .select('invoice_number, contract_id, amount, billing_data')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', invoiceNumbers)
    .not('contract_id', 'is', null);

  if (!invoices?.length) { console.error('❌ Aucune facture trouvée'); return; }
  console.log(`  ${invoices.length} / ${invoiceNumbers.length} factures trouvées en DB\n`);

  let nFixed = 0;
  let totalOldPA = 0;
  let totalNewPA = 0;

  for (const inv of invoices.sort((a,b) => a.invoice_number.localeCompare(b.invoice_number))) {
    const correctPA = CORRECT_PA[inv.invoice_number];
    const client = inv.billing_data?.contract_data?.client_name || '?';
    const margin = (inv.amount || 0) - correctPA;

    // Vérifier PA actuel
    const { data: existingCE } = await sb
      .from('contract_equipment')
      .select('id, purchase_price, quantity')
      .eq('contract_id', inv.contract_id);

    const currentPA = (existingCE || []).reduce((s,e) => s + (e.purchase_price||0)*(e.quantity||1), 0);
    totalOldPA += currentPA;
    totalNewPA += correctPA;

    const ecart = currentPA - correctPA;
    console.log(`  ${inv.invoice_number} | ${client}`);
    console.log(`    PA actuel: ${currentPA.toFixed(2)}€  →  PA correct: ${correctPA.toFixed(2)}€  (écart: ${ecart >= 0 ? '+' : ''}${ecart.toFixed(2)}€)`);

    if (Math.abs(ecart) < 0.01) {
      console.log(`    ✅ Déjà correct — skip\n`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`    → (dry-run) Supprimerait ${existingCE?.length || 0} ligne(s), créerait 1 ligne PA=${correctPA}€\n`);
      continue;
    }

    // Supprimer les lignes existantes
    if (existingCE?.length) {
      const { error: delErr } = await sb
        .from('contract_equipment')
        .delete()
        .in('id', existingCE.map(e => e.id));
      if (delErr) { console.error(`    ❌ Suppression: ${delErr.message}\n`); continue; }
    }

    // Insérer la ligne correcte
    const { error: insErr } = await sb.from('contract_equipment').insert({
      contract_id:     inv.contract_id,
      title:           'Voir facture',
      quantity:        1,
      purchase_price:  correctPA,
      margin:          margin,
      monthly_payment: 0,
    });
    if (insErr) { console.error(`    ❌ Insertion: ${insErr.message}\n`); continue; }

    console.log(`    ✅ Corrigé: ${currentPA.toFixed(2)}€ → ${correctPA.toFixed(2)}€\n`);
    nFixed++;
  }

  console.log('═'.repeat(60));
  if (!DRY_RUN) {
    console.log(`  Contrats corrigés  : ${nFixed}`);
    console.log(`  PA avant           : ${totalOldPA.toFixed(2)}€`);
    console.log(`  PA après (estimé)  : ${totalNewPA.toFixed(2)}€`);
    console.log(`\n  → Lance diagnose-2024.js pour vérifier le PA total`);
  } else {
    console.log(`  ${Object.keys(CORRECT_PA).length} corrections à appliquer (dry-run)`);
    console.log(`  PA actuel (ces 31) : ${totalOldPA.toFixed(2)}€`);
    console.log(`  PA correct (ces 31): ${totalNewPA.toFixed(2)}€`);
    console.log(`  Gain               : ${(totalOldPA - totalNewPA).toFixed(2)}€`);
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
