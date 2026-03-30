/**
 * fix-existing-contract-equipment.js
 *
 * Corrige les contract_equipment des 5 dossiers déjà en DB avant l'import 2023
 * (non créés par import-2023-excel.js car ils existaient déjà).
 *
 * Pour chaque dossier, on normalise actual_purchase_price de façon que
 * sum(actual_purchase_price * quantity) = d.achat (référence dataset).
 * On s'assure aussi que actual_purchase_date est dans le bon mois.
 *
 * Usage:
 *   node scripts/fix-existing-contract-equipment.js --dry-run
 *   node scripts/fix-existing-contract-equipment.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const DATASET_PATH         = join(__dirname, 'import-2023-dataset.json');
const MANIFEST_PATH        = join(__dirname, 'fix-existing-manifest.json');

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ROLLBACK = args.includes('rollback');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const MOIS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Dossiers skippés lors de l'import (déjà en DB) — à corriger
const SKIPPED_DOSSIERS = ['180-17784','180-17866','180-17879','180-17880','180-17915'];

async function doRollback() {
  console.log('\n🔄 ROLLBACK fix-existing-contract-equipment');
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

  // Restore original actual_purchase_price values
  let nRestored = 0;
  for (const update of (manifest.updates || [])) {
    const { error } = await sb
      .from('contract_equipment')
      .update({
        actual_purchase_price: update.original_actual_purchase_price,
        actual_purchase_date: update.original_actual_purchase_date,
      })
      .eq('id', update.id);
    if (error) console.error(`  ❌ ${update.id}: ${error.message}`);
    else nRestored++;
  }

  // Delete inserted rows
  const toDelete = (manifest.inserts || []).map(r => r.id);
  if (toDelete.length > 0) {
    const { error } = await sb.from('contract_equipment').delete().in('id', toDelete);
    if (error) console.error(`  ❌ delete inserts: ${error.message}`);
    else console.log(`  🗑️  contract_equipment (insertés): ${toDelete.length} supprimé(s)`);
  }

  console.log(`\n✅ Rollback terminé — ${nRestored} mise(s) à jour restaurée(s), ${toDelete.length} insertion(s) supprimée(s)`);
}

async function main() {
  if (ROLLBACK) { await doRollback(); return; }

  console.log(`\n🔧 Fix contract_equipment dossiers originaux${DRY_RUN ? ' [DRY-RUN]' : ''}`);
  console.log('═'.repeat(70));

  if (!existsSync(DATASET_PATH)) throw new Error(`Dataset introuvable: ${DATASET_PATH}`);
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));

  // Filtrer uniquement les dossiers skippés
  const dossiers = allDossiers.filter(d => SKIPPED_DOSSIERS.includes(d.dossier_number));
  console.log(`\n  Dossiers à corriger: ${dossiers.length}`);

  const manifest = { created_at: new Date().toISOString(), updates: [], inserts: [] };
  let nFixed = 0, nErrors = 0;

  for (const d of dossiers) {
    try {
      // Calculer le ratio de normalisation
      const equipmentRawTotal = d.equipment.reduce(
        (s, eq) => s + (eq.purchase_price || 0) * (eq.qty || 1), 0
      );
      const achatNormRatio = (d.achat > 0 && equipmentRawTotal > 0)
        ? d.achat / equipmentRawTotal : 1;

      // Date d'achat normalisée : 15 du mois_invoice
      const purchaseDate = `2023-${String(d.month_invoice).padStart(2,'0')}-15`;

      console.log(`\n  📁 ${d.dossier_number} — ${d.client_name || d.client_company}`);
      console.log(`     Mois: ${MOIS[d.month_invoice]}  CA=${d.ca.toFixed(2)}€  achat_ref=${d.achat.toFixed(2)}€`);
      console.log(`     equip_raw_total=${equipmentRawTotal.toFixed(2)}€  normRatio=${achatNormRatio.toFixed(4)}`);

      // Trouver l'offre via dossier_number
      const { data: offers } = await sb
        .from('offers')
        .select('id, client_name')
        .eq('dossier_number', d.dossier_number);

      if (!offers?.length) {
        console.log(`     ⚠️  Offre introuvable pour ${d.dossier_number}`);
        continue;
      }

      for (const offer of offers) {
        // Trouver le contrat lié à cette offre
        const { data: contracts } = await sb
          .from('contracts')
          .select('id')
          .eq('offer_id', offer.id);

        if (!contracts?.length) {
          console.log(`     ⚠️  Contrat introuvable pour offer ${offer.id}`);
          continue;
        }

        for (const contract of contracts) {
          // Lire les contract_equipment existants
          const { data: existing } = await sb
            .from('contract_equipment')
            .select('id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date')
            .eq('contract_id', contract.id);

          console.log(`     Contrat ${contract.id}: ${existing?.length || 0} lignes équipement existantes`);

          if (existing?.length > 0) {
            // Calculer le total actuel
            const currentTotal = existing.reduce(
              (s, e) => s + (e.actual_purchase_price || e.purchase_price || 0) * (e.quantity || 1), 0
            );
            console.log(`     Total actuel actual_purchase_price: ${currentTotal.toFixed(2)}€  (réf: ${d.achat.toFixed(2)}€)`);

            if (DRY_RUN) {
              console.log(`     [DRY-RUN] Mettrait à jour ${existing.length} lignes avec normRatio=${achatNormRatio.toFixed(4)}, date=${purchaseDate}`);
              continue;
            }

            // Mettre à jour chaque ligne
            for (const eq of existing) {
              const newActualPurchasePrice = Math.round(
                (eq.purchase_price || eq.actual_purchase_price || 0) * achatNormRatio * 100
              ) / 100;

              // Sauvegarder les valeurs originales dans le manifest
              manifest.updates.push({
                id: eq.id,
                original_actual_purchase_price: eq.actual_purchase_price,
                original_actual_purchase_date: eq.actual_purchase_date,
              });

              const { error } = await sb
                .from('contract_equipment')
                .update({
                  actual_purchase_price: newActualPurchasePrice,
                  actual_purchase_date: purchaseDate,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', eq.id);

              if (error) {
                console.error(`     ❌ Update ${eq.id}: ${error.message}`);
                nErrors++;
              }
            }

            const newTotal = existing.reduce(
              (s, e) => s + Math.round((e.purchase_price || e.actual_purchase_price || 0) * achatNormRatio * 100) / 100 * (e.quantity || 1), 0
            );
            console.log(`     ✅ Mis à jour: ${existing.length} lignes, nouveau total=${newTotal.toFixed(2)}€ (réf=${d.achat.toFixed(2)}€)`);
            nFixed++;

          } else {
            // Pas de contract_equipment existant → en créer depuis le dataset
            console.log(`     Aucun contract_equipment existant → insertion depuis dataset`);

            if (DRY_RUN) {
              console.log(`     [DRY-RUN] Insérerait ${d.equipment.length} lignes`);
              continue;
            }

            const ceRows = d.equipment.map(e => ({
              contract_id: contract.id,
              title: e.title,
              quantity: e.qty,
              purchase_price: e.purchase_price || 0,
              actual_purchase_price: Math.round((e.purchase_price || 0) * achatNormRatio * 100) / 100,
              actual_purchase_date: purchaseDate,
              order_date: d.date_dossier,
              order_status: 'received',
              margin: 0,
              created_at: d.date_dossier,
              updated_at: d.date_dossier,
            }));

            const { data: inserted, error } = await sb
              .from('contract_equipment')
              .insert(ceRows)
              .select('id');

            if (error) {
              console.error(`     ❌ Insert: ${error.message}`);
              nErrors++;
            } else {
              manifest.inserts.push(...inserted.map(r => ({ id: r.id, dossier: d.dossier_number })));
              const newTotal = ceRows.reduce((s, e) => s + e.actual_purchase_price * e.quantity, 0);
              console.log(`     ✅ Inséré: ${ceRows.length} lignes, total=${newTotal.toFixed(2)}€ (réf=${d.achat.toFixed(2)}€)`);
              nFixed++;
            }
          }
        }
      }
    } catch(err) {
      nErrors++;
      console.error(`  ❌ ${d.dossier_number}: ${err.message}`);
    }
  }

  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n💾 Manifest: ${MANIFEST_PATH}`);
    console.log(`🔄 Rollback: node scripts/fix-existing-contract-equipment.js rollback`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`✅  Dossiers corrigés  : ${nFixed}`);
  if (nErrors) console.log(`❌  Erreurs            : ${nErrors}`);
  if (DRY_RUN) console.log(`\nℹ️  DRY-RUN — relancer sans --dry-run pour appliquer.`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
