/**
 * diagnose-invoices-january.js
 *
 * Vérifie exactement ce que la fonction SQL get_monthly_financial_data voit pour Janvier :
 * - Quels dossiers ont une invoice en DB ?
 * - Quelle est l'invoice_date de chaque invoice ?
 * - Quel est le sum(actual_purchase_price*qty) de leur contract_equipment ?
 * - Simule le calcul SQL du dashboard
 *
 * Usage : node scripts/diagnose-invoices-january.js
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

async function main() {
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));
  const janvDossiers = allDossiers.filter(d => d.month_invoice === 1);

  console.log('\n🔍 SIMULATION SQL get_monthly_financial_data — JANVIER 2023\n');
  console.log('═'.repeat(100));

  // ── 1. Pour chaque dossier Janvier : cherche l'invoice en DB ──────────────
  console.log('\n📋 ÉTAT DES INVOICES PAR DOSSIER :');
  console.log('─'.repeat(100));

  const monthlyByInvoice = {}; // month_num → { revenue, purchases }
  const dossiersWithNoInvoice = [];

  for (const d of janvDossiers) {
    // Trouve offer
    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', d.dossier_number);
    if (!offers?.length) { console.log(`⚠️  ${d.dossier_number}: pas d'offre en DB`); continue; }

    // Trouve contracts
    const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offers.map(o => o.id));
    const contractIds = contracts?.map(c => c.id) || [];

    // Cherche invoices liées à ces contracts (ou offers)
    let invoices = [];
    if (contractIds.length > 0) {
      const { data: byContract } = await sb
        .from('invoices')
        .select('id, invoice_number, invoice_date, created_at, amount, contract_id, offer_id, invoice_type')
        .in('contract_id', contractIds);
      invoices = byContract || [];
    }
    // Aussi par offer_id
    const { data: byOffer } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_date, created_at, amount, contract_id, offer_id, invoice_type')
      .in('offer_id', offers.map(o => o.id));

    for (const inv of byOffer || []) {
      if (!invoices.find(i => i.id === inv.id)) invoices.push(inv);
    }

    if (!invoices.length) {
      console.log(`❌ ${d.dossier_number.padEnd(12)} ${(d.client_name||'').padEnd(25)} → AUCUNE INVOICE en DB! (achat_ref=${d.achat}€)`);
      dossiersWithNoInvoice.push(d);
      continue;
    }

    for (const inv of invoices) {
      const invDate = inv.invoice_date || inv.created_at;
      const month   = invDate ? new Date(invDate).getUTCMonth() + 1 : '?';
      const monthIcon = month === 1 ? '✅' : `⚠️  mois ${month}`;

      // Calcul purchases comme le fait la SQL
      let purchases = 0;
      if (inv.contract_id) {
        const { data: ceRows } = await sb
          .from('contract_equipment')
          .select('actual_purchase_price, purchase_price, quantity')
          .eq('contract_id', inv.contract_id);
        purchases = (ceRows || []).reduce(
          (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
        );
      } else if (inv.offer_id) {
        // Fallback: billing_data.equipment_data
        const { data: invFull } = await sb.from('invoices').select('billing_data').eq('id', inv.id).single();
        const eqData = invFull?.billing_data?.equipment_data || [];
        purchases = eqData.reduce((s, e) => s + (e.purchase_price || 0) * (e.quantity || 1), 0);
        console.log(`   ⚠️  Utilise billing_data (pas de contract_id!) pp_sum=${purchases.toFixed(2)}€`);
      }

      // Accumulate by month
      if (!monthlyByInvoice[month]) monthlyByInvoice[month] = { revenue: 0, purchases: 0, invoices: [] };
      monthlyByInvoice[month].revenue   += inv.amount || 0;
      monthlyByInvoice[month].purchases += purchases;
      monthlyByInvoice[month].invoices.push({ inv, purchases });

      console.log(
        `${monthIcon === '✅' ? '✅' : '📅'} ${d.dossier_number.padEnd(12)} ${(d.client_name||'').padEnd(25)} ` +
        `invoice=${inv.invoice_number?.padEnd(20)||'?'.padEnd(20)} ` +
        `invoice_date=${invDate?.substring(0,10)||'null'}  mois=${month}  ` +
        `montant=${(inv.amount||0).toFixed(2).padStart(10)}€  purchases=${purchases.toFixed(2).padStart(10)}€  ref_achat=${d.achat.toFixed(2)}€`
      );
    }
  }

  // ── 2. Simulation mensuelle ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(100));
  console.log('📅 SIMULATION MENSUELLE (ce que le dashboard calcule) :');

  const months = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  for (const [m, data] of Object.entries(monthlyByInvoice).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    const marg = data.revenue - data.purchases;
    console.log(`\n  ${months[parseInt(m)]} (${data.invoices.length} factures) : CA=${data.revenue.toFixed(2)}€  Achats=${data.purchases.toFixed(2)}€  Marge=${marg.toFixed(2)}€`);
  }

  const janvData = monthlyByInvoice[1] || { revenue: 0, purchases: 0 };
  console.log(`\n  JANVIER résumé :`);
  console.log(`    CA         = ${janvData.revenue.toFixed(2)}€`);
  console.log(`    Achats     = ${janvData.purchases.toFixed(2)}€  (dashboard affiche: 21,790.35€)`);
  console.log(`    Marge      = ${(janvData.revenue - janvData.purchases).toFixed(2)}€  (dashboard affiche: 47,878.65€)`);

  // ── 3. Dossiers sans invoice ─────────────────────────────────────────────
  if (dossiersWithNoInvoice.length) {
    console.log('\n' + '═'.repeat(100));
    console.log(`❌ ${dossiersWithNoInvoice.length} DOSSIERS SANS INVOICE EN DB :`);
    for (const d of dossiersWithNoInvoice) {
      console.log(`   - ${d.dossier_number} ${d.client_name}: ca=${d.ca}€, achat=${d.achat}€, invoice_ref=${d.invoice_number}`);
    }
    console.log('\n→ Ces dossiers n\'apparaissent PAS dans le tableau mensuel du dashboard.');
    console.log('→ Il faut créer leurs invoices pour les voir dans le dashboard.');
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
