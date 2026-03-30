/**
 * diagnose-sql-exact.js
 *
 * Réplique EXACTEMENT la logique SQL de get_monthly_financial_data pour l'année 2023.
 *
 * SQL original :
 *   - Groupe les invoices par EXTRACT(month FROM COALESCE(invoice_date, created_at))
 *   - Pour purchases:
 *       Si contract_id IS NOT NULL → SUM(ce.actual_purchase_price * qty) depuis contract_equipment
 *       Sinon                      → SUM depuis billing_data.equipment_data.purchase_price
 *   - Filtre company_id = user_company_id
 *
 * Usage : node scripts/diagnose-sql-exact.js
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

// Références attendues par mois (issues du dataset + records protégés)
const CORRECT_MARGE = {
  1: null, // À calculer
  2: null,
  3: null,
  8: 3700.14, // référence original pour Août
};

async function main() {
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));

  // ── Récupère le company_id réel ───────────────────────────────────────────
  const { data: sampleInv } = await sb.from('invoices').select('company_id').not('company_id', 'is', null).limit(1);
  const COMPANY_ID = sampleInv?.[0]?.company_id;
  if (!COMPANY_ID) { console.error('❌ company_id introuvable'); process.exit(1); }
  console.log(`\n🏢 Company ID : ${COMPANY_ID}`);

  // ── Récupère TOUTES les invoices 2023 avec company_id correct ───────────────
  const { data: invoices2023 } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, created_at, amount, credited_amount, contract_id, offer_id, invoice_type, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31');

  console.log(`\n📋 ${invoices2023?.length || 0} invoices 2023 avec company_id=${COMPANY_ID}`);

  // ── Récupère contract_equipment pour tous les contrats concernés ──────────
  const contractIds = [...new Set((invoices2023 || []).map(i => i.contract_id).filter(Boolean))];
  const { data: allCE } = await sb
    .from('contract_equipment')
    .select('contract_id, actual_purchase_price, purchase_price, quantity')
    .in('contract_id', contractIds);

  // Map contract_id → sum purchases
  const ceByContract = {};
  for (const e of allCE || []) {
    if (!ceByContract[e.contract_id]) ceByContract[e.contract_id] = 0;
    ceByContract[e.contract_id] += (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1);
  }

  // Map dossier_number → dataset info
  const datasetByInvoiceNum = {};
  for (const d of allDossiers) {
    if (d.invoice_number) datasetByInvoiceNum[d.invoice_number.trim()] = d;
  }

  // ── Simule la SQL : groupe par mois ──────────────────────────────────────
  const monthData = {}; // month → { revenue, purchases, invoices[] }

  for (const inv of invoices2023 || []) {
    const invDate = inv.invoice_date || inv.created_at;
    const month   = new Date(invDate).getUTCMonth() + 1;
    if (!monthData[month]) monthData[month] = { revenue: 0, purchases: 0, invoices: [] };

    const revenue = (inv.amount || 0) - (inv.credited_amount || 0);

    // Calcul purchases exactement comme la SQL
    let purchases = 0;
    let purchaseSource = '?';
    if (inv.credited_amount >= inv.amount) {
      purchases = 0;
      purchaseSource = 'credited (0)';
    } else if (inv.contract_id) {
      purchases = ceByContract[inv.contract_id] || 0;
      purchaseSource = `contract_equipment (contract ${inv.contract_id.substring(0,8)}…)`;
    } else {
      // Fallback: billing_data.equipment_data
      const eqData = inv.billing_data?.equipment_data || [];
      purchases = eqData.reduce((s, e) => s + (parseFloat(e.purchase_price)||0) * (parseFloat(e.quantity)||1), 0);
      purchaseSource = `billing_data (${eqData.length} items)`;
    }

    monthData[month].revenue   += revenue;
    monthData[month].purchases += purchases;
    monthData[month].invoices.push({
      invoice_number: inv.invoice_number,
      invoice_date: invDate?.substring(0, 10),
      amount: inv.amount,
      contract_id: inv.contract_id,
      revenue,
      purchases,
      purchaseSource,
    });
  }

  // ── Affichage par mois ────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(110));
  console.log('RÉSULTATS PAR MOIS (simulation exacte SQL) :');
  console.log('═'.repeat(110));

  const Q1 = [1, 2, 3];
  let q1Revenue = 0, q1Purchases = 0;

  for (let m = 1; m <= 12; m++) {
    const data = monthData[m] || { revenue: 0, purchases: 0, invoices: [] };
    const marge = data.revenue - data.purchases;
    const isQ1 = Q1.includes(m);
    if (isQ1) { q1Revenue += data.revenue; q1Purchases += data.purchases; }

    if (data.invoices.length === 0 && m !== 8) continue;

    console.log(`\n📅 ${MOIS[m]} (${data.invoices.length} factures) : CA=${data.revenue.toFixed(2)}€  Achats=${data.purchases.toFixed(2)}€  Marge=${marge.toFixed(2)}€`);

    // Tri par problème potentiel
    for (const inv of data.invoices.sort((a, b) => a.invoice_number?.localeCompare(b.invoice_number))) {
      const d = allDossiers.find(x => x.invoice_number?.trim() === inv.invoice_number?.trim());
      const refAchat = d?.achat || 0;
      const pDiff = Math.abs(inv.purchases - refAchat) > 0.10 ? ` ← ❌ réf=${refAchat.toFixed(2)}€ diff=${(inv.purchases - refAchat).toFixed(2)}€` : '';
      const noContract = !inv.contract_id ? ' ⚠️  PAS DE CONTRACT_ID → utilise billing_data' : '';

      console.log(
        `   ${pDiff||noContract ? '🔴' : '✅'} ${(inv.invoice_number||'?').padEnd(22)} ` +
        `date=${inv.invoice_date}  CA=${inv.revenue.toFixed(2).padStart(10)}€  ` +
        `achats=${inv.purchases.toFixed(2).padStart(10)}€${pDiff}${noContract}`
      );
      if (pDiff || noContract) {
        console.log(`      source=${inv.purchaseSource}`);
      }
    }
  }

  // ── Q1 résumé ─────────────────────────────────────────────────────────────
  const q1Marge = q1Revenue - q1Purchases;
  console.log('\n' + '═'.repeat(110));
  console.log('📊 RÉSUMÉ Q1 (Janvier–Mars) :');
  console.log(`   CA       = ${q1Revenue.toFixed(2)}€`);
  console.log(`   Achats   = ${q1Purchases.toFixed(2)}€`);
  console.log(`   Marge    = ${q1Marge.toFixed(2)}€  (dashboard: 89,531.11€ / correct: 84,951.76€)`);
  console.log(`   Écart vs correct: ${(q1Marge - 84951.76).toFixed(2)}€`);

  // ── Invoices avec contract_id manquant ou wrong ───────────────────────────
  console.log('\n' + '═'.repeat(110));
  console.log('🔍 INVOICES SANS CONTRACT_ID (utilisent billing_data pour achats) :');
  let noBillingCount = 0;
  for (const [m, data] of Object.entries(monthData)) {
    for (const inv of data.invoices) {
      if (!inv.contract_id) {
        const d = allDossiers.find(x => x.invoice_number?.trim() === inv.invoice_number?.trim());
        console.log(`   ${MOIS[parseInt(m)].padEnd(12)} ${(inv.invoice_number||'?').padEnd(22)} ` +
          `achats_billing=${inv.purchases.toFixed(2)}€  ref=${(d?.achat||0).toFixed(2)}€  source=${inv.purchaseSource}`);
        noBillingCount++;
      }
    }
  }
  if (!noBillingCount) console.log('   (aucune)');

  // ── Invoices avec contract_equipment = 0 (contract_id existe mais pas de CE) ──
  console.log('\n' + '═'.repeat(110));
  console.log('🔍 INVOICES AVEC CONTRACT_ID MAIS ACHATS = 0 :');
  let noEquipCount = 0;
  for (const [m, data] of Object.entries(monthData)) {
    for (const inv of data.invoices) {
      if (inv.contract_id && inv.purchases === 0 && inv.revenue > 0) {
        const d = allDossiers.find(x => x.invoice_number?.trim() === inv.invoice_number?.trim());
        console.log(`   ${MOIS[parseInt(m)].padEnd(12)} ${(inv.invoice_number||'?').padEnd(22)} ` +
          `contract_id=${inv.contract_id.substring(0,8)}…  ref_achat=${(d?.achat||0).toFixed(2)}€`);
        noEquipCount++;
      }
    }
  }
  if (!noEquipCount) console.log('   (aucune)');

  // ── Août détail ────────────────────────────────────────────────────────────
  const aout = monthData[8] || { revenue: 0, purchases: 0, invoices: [] };
  const aoutRef = allDossiers.filter(d => d.month_invoice === 8).reduce((s, d) => s + d.achat, 0);
  console.log('\n' + '═'.repeat(110));
  console.log('🔍 AOÛT DÉTAIL :');
  console.log(`   CA=${aout.revenue.toFixed(2)}€  Achats=${aout.purchases.toFixed(2)}€  Marge=${(aout.revenue-aout.purchases).toFixed(2)}€`);
  console.log(`   Ref achats dataset=${aoutRef.toFixed(2)}€  Diff=${(aout.purchases-aoutRef).toFixed(2)}€`);
  for (const inv of aout.invoices) {
    const d = allDossiers.find(x => x.invoice_number?.trim() === inv.invoice_number?.trim());
    console.log(`   ${(inv.invoice_number||'?').padEnd(22)} CA=${inv.revenue.toFixed(2)}€  achats=${inv.purchases.toFixed(2)}€  ref=${(d?.achat||0).toFixed(2)}€  source=${inv.purchaseSource}`);
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
