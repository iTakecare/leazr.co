/**
 * diagnose-margins.js
 *
 * Compare each dossier's DB contract_equipment totals vs dataset reference (d.achat).
 * Groups by month to show where discrepancies come from.
 *
 * Usage:
 *   node scripts/diagnose-margins.js
 *   node scripts/diagnose-margins.js --month=1   (filter by month)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const DATASET_PATH         = join(__dirname, 'import-2023-dataset.json');

const args = process.argv.slice(2);
const FILTER_MONTH = args.find(a => a.startsWith('--month='))
  ? parseInt(args.find(a => a.startsWith('--month=')).split('=')[1])
  : null;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const MOIS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

async function main() {
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));

  const dossiers = FILTER_MONTH
    ? allDossiers.filter(d => d.month_invoice === FILTER_MONTH)
    : allDossiers;

  console.log(`\n🔍 Diagnostic marges — ${dossiers.length} dossier(s)${FILTER_MONTH ? ` (mois ${MOIS[FILTER_MONTH]})` : ''}`);
  console.log('═'.repeat(90));

  // Monthly totals tracking
  const monthTotals = {}; // { month: { ref: 0, db: 0, ca_ref: 0, ca_db: 0 } }

  let nOk = 0, nWrong = 0, nMissing = 0;

  for (const d of dossiers) {
    const month = d.month_invoice;
    if (!monthTotals[month]) monthTotals[month] = { ref: 0, db: 0, ca_ref: 0, ca_db: 0, dossiers: [] };
    monthTotals[month].ca_ref += d.ca;
    monthTotals[month].ref += d.achat;

    // Find offer
    const { data: offers } = await sb
      .from('offers')
      .select('id, financed_amount, created_at')
      .eq('dossier_number', d.dossier_number);

    if (!offers?.length) {
      console.log(`  ⚠️  ${d.dossier_number}: offre introuvable en DB`);
      nMissing++;
      continue;
    }

    // Find contracts
    const offerIds = offers.map(o => o.id);
    const { data: contracts } = await sb
      .from('contracts')
      .select('id')
      .in('offer_id', offerIds);

    if (!contracts?.length) {
      console.log(`  ⚠️  ${d.dossier_number}: contrat introuvable en DB`);
      nMissing++;
      continue;
    }

    const contractIds = contracts.map(c => c.id);

    // Get contract_equipment
    const { data: ceRows } = await sb
      .from('contract_equipment')
      .select('id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date, margin, monthly_payment')
      .in('contract_id', contractIds);

    const dbTotal = (ceRows || []).reduce(
      (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
    );
    const dbTotalRounded = Math.round(dbTotal * 100) / 100;
    const refAchat = d.achat;
    const diff = Math.round((dbTotalRounded - refAchat) * 100) / 100;
    const diffPct = refAchat > 0 ? (diff / refAchat * 100).toFixed(1) : 'N/A';

    monthTotals[month].db += dbTotalRounded;
    monthTotals[month].dossiers.push({
      dossier: d.dossier_number,
      client: (d.client_name || d.client_company || '').substring(0, 25),
      month,
      ref: refAchat,
      db: dbTotalRounded,
      diff,
      nRows: (ceRows || []).length,
    });

    const ok = Math.abs(diff) < 0.10;
    if (ok) {
      nOk++;
    } else {
      nWrong++;
      const sign = diff > 0 ? '+' : '';
      console.log(
        `  ${diff > 0 ? '🔴' : '🟡'} ${d.dossier_number.padEnd(12)} [${MOIS[month].padEnd(9)}] ` +
        `${(d.client_name || d.client_company || '').substring(0, 22).padEnd(22)} ` +
        `ref=${refAchat.toFixed(2).padStart(10)}€  db=${dbTotalRounded.toFixed(2).padStart(10)}€  ` +
        `diff=${sign}${diff.toFixed(2)}€ (${sign}${diffPct}%)  rows=${ceRows?.length || 0}`
      );

      // Show detail of equipment rows
      if (ceRows?.length > 0) {
        for (const eq of ceRows) {
          const pp = eq.actual_purchase_price ?? eq.purchase_price ?? 0;
          console.log(
            `      └─ ${(eq.title || '').substring(0, 35).padEnd(35)} ` +
            `qty=${eq.quantity}  pp=${pp.toFixed(2)}€  ` +
            `actual_date=${eq.actual_purchase_date || 'null'}`
          );
        }
      } else {
        console.log(`      └─ ⚠️  Aucun contract_equipment en DB!`);
      }
    }
  }

  // Monthly summary
  console.log('\n' + '═'.repeat(90));
  console.log('📅 RÉCAPITULATIF PAR MOIS:');
  console.log('═'.repeat(90));
  console.log(
    `${'Mois'.padEnd(12)} ${'Achat Réf'.padStart(14)} ${'Achat DB'.padStart(14)} ${'Diff'.padStart(12)} ${'CA Réf'.padStart(12)}`
  );
  console.log('─'.repeat(90));

  const sortedMonths = Object.keys(monthTotals).map(Number).sort((a, b) => a - b);
  for (const m of sortedMonths) {
    const mt = monthTotals[m];
    const diff = Math.round((mt.db - mt.ref) * 100) / 100;
    const sign = diff > 0 ? '+' : '';
    const icon = Math.abs(diff) < 1 ? '✅' : (diff > 0 ? '🔴' : '🟡');
    console.log(
      `${icon} ${MOIS[m].padEnd(11)} ${mt.ref.toFixed(2).padStart(14)}€ ${mt.db.toFixed(2).padStart(14)}€ ` +
      `${(sign + diff.toFixed(2)).padStart(11)}€ ${mt.ca_ref.toFixed(2).padStart(11)}€`
    );
  }

  console.log('\n' + '═'.repeat(90));
  console.log(`✅ Corrects : ${nOk}  |  ❌ Incorrects : ${nWrong}  |  ⚠️  Manquants : ${nMissing}`);

  // List wrong dossiers grouped by month for quick fix reference
  if (nWrong > 0) {
    console.log('\n📋 DOSSIERS À CORRIGER:');
    for (const m of sortedMonths) {
      const wrong = monthTotals[m].dossiers.filter(d => Math.abs(d.diff) >= 0.10);
      if (wrong.length > 0) {
        console.log(`\n  ${MOIS[m]}:`);
        for (const w of wrong) {
          const sign = w.diff > 0 ? '+' : '';
          console.log(`    - ${w.dossier} (${w.client}): diff=${sign}${w.diff.toFixed(2)}€`);
        }
      }
    }
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
