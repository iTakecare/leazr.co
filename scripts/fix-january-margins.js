/**
 * fix-january-margins.js
 *
 * Corrige les actual_purchase_price pour les dossiers avec écart vs référence dataset.
 *
 * Dossiers concernés :
 *   180-17784 (Patrick Malin)  : DB=9546.80€ vs réf=18892.00€ → ratio ×1.979
 *   180-17866 (Us BarberShop)  : DB=2570.69€ vs réf=3448.62€  → ratio ×1.341
 *   180-18618 (Patrick Malin)  : DB=40063.26€ vs réf=40063.36€ → arrondi -0.10€
 *   180-20362 (Nicolas Ceron)  : DB=20728.31€ vs réf=20728.50€ → arrondi -0.19€
 *   180-20346 (Nicolas Ceron)  : DB=9449.73€  vs réf=9450.00€  → arrondi -0.27€
 *
 * Usage :
 *   node scripts/fix-january-margins.js --dry-run
 *   node scripts/fix-january-margins.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const DATASET_PATH         = join(__dirname, 'import-2023-dataset.json');

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Dossiers à corriger (dossier_number → achat_ref)
const TARGETS = {
  '180-17784': 18892.00,
  '180-17866': 3448.62,
  '180-18618': 40063.36,
  '180-20362': 20728.50,
  '180-20346': 9450.00,
};

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN — aucune modification en base\n');

  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));
  const datasetMap = Object.fromEntries(allDossiers.map(d => [d.dossier_number, d]));

  for (const [dossierNum, achatRef] of Object.entries(TARGETS)) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📁 ${dossierNum}  (achat_ref=${achatRef}€)`);

    // Find offer
    const { data: offers } = await sb
      .from('offers')
      .select('id')
      .eq('dossier_number', dossierNum);

    if (!offers?.length) { console.log('   ❌ Offre introuvable'); continue; }

    const { data: contracts } = await sb
      .from('contracts')
      .select('id')
      .in('offer_id', offers.map(o => o.id));

    if (!contracts?.length) { console.log('   ❌ Contrat introuvable'); continue; }

    const contractIds = contracts.map(c => c.id);

    const { data: ceRows } = await sb
      .from('contract_equipment')
      .select('id, title, quantity, purchase_price, actual_purchase_price')
      .in('contract_id', contractIds);

    if (!ceRows?.length) { console.log('   ❌ Aucun contract_equipment'); continue; }

    // Current DB total using actual_purchase_price ?? purchase_price
    const dbTotal = ceRows.reduce(
      (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
    );

    const ratio = achatRef / dbTotal;
    const newDbTotal = achatRef; // target

    console.log(`   Rows         : ${ceRows.length}`);
    console.log(`   DB total     : ${dbTotal.toFixed(2)}€`);
    console.log(`   Achat réf    : ${achatRef.toFixed(2)}€`);
    console.log(`   Diff         : ${(dbTotal - achatRef).toFixed(2)}€`);
    console.log(`   Ratio fix    : ×${ratio.toFixed(6)}`);

    // Compute new actual_purchase_price for each row
    let newTotal = 0;
    const updates = ceRows.map((e, i) => {
      const oldPP = e.actual_purchase_price ?? e.purchase_price ?? 0;
      // For last row, assign the remainder to avoid floating point drift
      let newPP;
      if (i === ceRows.length - 1) {
        // remainder = (achatRef - newTotal) / qty
        newPP = Math.round(((achatRef - newTotal) / (e.quantity || 1)) * 100) / 100;
      } else {
        newPP = Math.round(oldPP * ratio * 100) / 100;
        newTotal += newPP * (e.quantity || 1);
      }
      return { id: e.id, title: e.title, qty: e.quantity, oldPP, newPP };
    });

    for (const u of updates) {
      const oldTotal = u.oldPP * u.qty;
      const newTotalLine = u.newPP * u.qty;
      console.log(
        `   ${DRY_RUN ? '[DRY]' : '    '} ${(u.title || '').substring(0, 35).padEnd(35)} ` +
        `qty=${u.qty}  ${u.oldPP.toFixed(2).padStart(9)}€ → ${u.newPP.toFixed(2).padStart(9)}€` +
        `  (ligne: ${oldTotal.toFixed(2)}€ → ${newTotalLine.toFixed(2)}€)`
      );
    }

    // Verify new total
    const verifyTotal = updates.reduce((s, u) => s + u.newPP * u.qty, 0);
    console.log(`   Vérif total  : ${verifyTotal.toFixed(2)}€ (cible: ${achatRef.toFixed(2)}€, écart: ${(verifyTotal - achatRef).toFixed(2)}€)`);

    if (!DRY_RUN) {
      let nOk = 0, nErr = 0;
      for (const u of updates) {
        const { error } = await sb
          .from('contract_equipment')
          .update({ actual_purchase_price: u.newPP, updated_at: new Date().toISOString() })
          .eq('id', u.id);
        if (error) { console.log(`   ❌ Update erreur pour id=${u.id}: ${error.message}`); nErr++; }
        else nOk++;
      }
      console.log(`   ✅ ${nOk} lignes mises à jour${nErr ? `  ❌ ${nErr} erreurs` : ''}`);
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  if (DRY_RUN) {
    console.log('⚠️  Dry-run terminé — relancer sans --dry-run pour appliquer les corrections');
  } else {
    console.log('✅ Corrections appliquées — relance diagnose-margins.js pour vérifier');
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
