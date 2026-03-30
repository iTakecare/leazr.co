/**
 * diagnose-january-detail.js
 *
 * Diagnostic détaillé pour Janvier 2023 :
 *   - Pour chaque dossier du dataset month_invoice=1, montre les valeurs DB
 *   - Affiche l'actual_purchase_DATE réelle en DB (= ce que le dashboard lit)
 *   - Identifie les dossiers dont la date est dans le mauvais mois
 *   - Affiche aussi ce que le dashboard voit réellement en Janvier
 *
 * Usage : node scripts/diagnose-january-detail.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const DATASET_PATH         = join(__dirname, 'import-2023-dataset.json');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const MOIS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

async function main() {
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));
  const janvDossiers = allDossiers.filter(d => d.month_invoice === 1);

  console.log(`\n🔍 DIAGNOSTIC DÉTAILLÉ — JANVIER 2023 (${janvDossiers.length} dossiers dataset)\n`);

  // ── 1. Par dossier : dataset vs DB ──────────────────────────────────────
  console.log('═'.repeat(100));
  console.log('DOSSIER PAR DOSSIER :');
  console.log('═'.repeat(100));

  let datasetTotal = 0;
  let dbTotalJanv  = 0; // sum of rows where actual_purchase_date is in January

  for (const d of janvDossiers) {
    datasetTotal += d.achat;

    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', d.dossier_number);
    if (!offers?.length) { console.log(`⚠️  ${d.dossier_number}: offre manquante`); continue; }

    const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offers.map(o => o.id));
    if (!contracts?.length) { console.log(`⚠️  ${d.dossier_number}: contrat manquant`); continue; }

    const { data: ceRows } = await sb
      .from('contract_equipment')
      .select('id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date')
      .in('contract_id', contracts.map(c => c.id));

    if (!ceRows?.length) {
      console.log(`❌ ${d.dossier_number} (${d.client_name}): AUCUN contract_equipment!`);
      continue;
    }

    // Group DB rows by month of actual_purchase_date
    const byMonth = {};
    let dbSum = 0;
    for (const e of ceRows) {
      const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
      const contribution = pp * (e.quantity || 1);
      dbSum += contribution;

      const dateStr = e.actual_purchase_date;
      const month   = dateStr ? new Date(dateStr).getUTCMonth() + 1 : 0;
      if (!byMonth[month]) byMonth[month] = 0;
      byMonth[month] += contribution;
    }

    // Count what's in January for dashboard
    const dbContribToJanv = byMonth[1] || 0;
    dbTotalJanv += dbContribToJanv;

    const diff = Math.round((dbSum - d.achat) * 100) / 100;
    const wrongMonth = !byMonth[1] || Object.keys(byMonth).some(m => parseInt(m) !== 1);

    const statusIcon = (Math.abs(diff) < 0.10 && !wrongMonth) ? '✅' : (wrongMonth ? '📅' : '🔴');

    console.log(`\n${statusIcon} ${d.dossier_number.padEnd(12)} ${(d.client_name||'').padEnd(25)} ref=${d.achat.toFixed(2).padStart(10)}€  db=${dbSum.toFixed(2).padStart(10)}€  diff=${diff >= 0 ? '+' : ''}${diff.toFixed(2)}€`);
    console.log(`   Date facture dataset: ${d.date_facture}  |  Date dossier: ${d.date_dossier}`);
    console.log(`   Répartition DB par mois :`);
    for (const [m, amt] of Object.entries(byMonth).sort()) {
      const icon = parseInt(m) === 1 ? '✅' : '⚠️ MAUVAIS MOIS';
      console.log(`     ${icon} → ${MOIS[parseInt(m)]||'?'} (mois ${m}): ${amt.toFixed(2)}€`);
    }
    console.log(`   → Dashboard Janvier reçoit: ${dbContribToJanv.toFixed(2)}€ (cible: ${d.achat.toFixed(2)}€)`);
  }

  // ── 2. Résumé Janvier ───────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(100));
  console.log('📅 RÉSUMÉ JANVIER :');
  console.log(`   Dataset référence total achat : ${datasetTotal.toFixed(2)}€`);
  console.log(`   Dashboard voit en Janvier     : ${dbTotalJanv.toFixed(2)}€`);
  console.log(`   Écart                         : ${(dbTotalJanv - datasetTotal).toFixed(2)}€`);
  console.log(`   Dashboard actuel (screenshot) : 21,790.35€`);

  // ── 3. Ce que le dashboard voit RÉELLEMENT en Janvier ────────────────────
  console.log('\n' + '═'.repeat(100));
  console.log('🔭 CE QUE LE DASHBOARD VOIT EN JANVIER (toutes origines) :');
  console.log('   (contract_equipment avec actual_purchase_date dans Janvier 2023)');

  // Get all contracts from 2023 offers
  const { data: allOffers2023 } = await sb
    .from('offers')
    .select('id, dossier_number, created_at')
    .like('created_at', '2023%');

  if (allOffers2023?.length) {
    const { data: allContracts2023 } = await sb
      .from('contracts')
      .select('id, offer_id')
      .in('offer_id', allOffers2023.map(o => o.id));

    const { data: allCE2023 } = await sb
      .from('contract_equipment')
      .select('id, contract_id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date')
      .in('contract_id', allContracts2023.map(c => c.id));

    const contractToOffer = Object.fromEntries(allContracts2023.map(c => [c.id, c.offer_id]));
    const offerToDossier  = Object.fromEntries(allOffers2023.map(o => [o.id, o.dossier_number]));

    const januaryRows = (allCE2023 || []).filter(e => {
      if (!e.actual_purchase_date) return false;
      return new Date(e.actual_purchase_date).getUTCMonth() === 0; // January = 0
    });

    const byDossier = {};
    for (const e of januaryRows) {
      const offerId  = contractToOffer[e.contract_id];
      const dossier  = offerToDossier[offerId] || 'inconnu';
      if (!byDossier[dossier]) byDossier[dossier] = { total: 0, rows: [] };
      const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
      byDossier[dossier].total += pp * (e.quantity || 1);
      byDossier[dossier].rows.push(e);
    }

    let dashboardJanvTotal = 0;
    for (const [dossier, data] of Object.entries(byDossier).sort()) {
      dashboardJanvTotal += data.total;
      const d = allDossiers.find(x => x.dossier_number === dossier);
      const ref = d?.achat || 0;
      const icon = Math.abs(data.total - ref) < 0.10 ? '✅' : (data.total > ref ? '🔴' : '🟡');
      console.log(`   ${icon} ${dossier.padEnd(12)} total=${data.total.toFixed(2).padStart(10)}€  ref=${ref.toFixed(2).padStart(10)}€  diff=${(data.total-ref).toFixed(2)}€`);
    }
    console.log(`\n   TOTAL DASHBOARD JANVIER: ${dashboardJanvTotal.toFixed(2)}€`);
    console.log(`   (Attendu: 21,790.35€)`);

    // Check dossiers in dataset month=1 but NOT visible in January dashboard
    console.log('\n   Dossiers dataset Janvier ABSENTS du dashboard Janvier :');
    for (const d of janvDossiers) {
      if (!byDossier[d.dossier_number]) {
        console.log(`   ❌ ${d.dossier_number} (${d.client_name}): ${d.achat.toFixed(2)}€ → introuvable en Janvier DB!`);
      }
    }
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
