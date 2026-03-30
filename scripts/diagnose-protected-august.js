/**
 * diagnose-protected-august.js
 *
 * 1. Vérifie invoice_type pour toutes les invoices 2023 (notamment ITC-2023-005)
 * 2. Détail des records protégés Février (ITC-2023-007, ITC-2023-008)
 *    → Cherche l'écart de 334.99€ entre simulation (85286.75) et correct (84951.76)
 * 3. Détail Août → achats corrects vs DB
 *
 * Usage : node scripts/diagnose-protected-august.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const DATASET_PATH = join(__dirname, 'import-2023-dataset.json');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));

  const { data: sampleInv } = await sb.from('invoices').select('company_id').not('company_id', 'is', null).limit(1);
  const COMPANY_ID = sampleInv?.[0]?.company_id;

  // ── 1. Tous les invoice_type 2023 ─────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('1. INVOICE_TYPE de toutes les invoices 2023 :');
  console.log('══════════════════════════════════════════════════════════');

  const { data: allInv } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, invoice_type, amount, contract_id, company_id')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31')
    .order('invoice_date');

  const typeGroups = {};
  for (const inv of allInv || []) {
    const t = inv.invoice_type || 'null';
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(inv);
  }

  for (const [type, invs] of Object.entries(typeGroups)) {
    console.log(`\n  Type: "${type}" (${invs.length} factures)`);
    for (const inv of invs) {
      const hasContract = inv.contract_id ? '✅ contrat' : '❌ pas contrat';
      console.log(`    ${(inv.invoice_number||'?').padEnd(22)} date=${inv.invoice_date?.substring(0,10)}  montant=${(inv.amount||0).toFixed(2).padStart(10)}€  ${hasContract}`);
    }
  }

  // ── 2. Records protégés Février : ITC-2023-007 et ITC-2023-008 ───────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('2. RECORDS PROTÉGÉS FÉVRIER — détail contract_equipment :');
  console.log('   (cherche l\'écart de 334.99€ entre simulation et correct)');
  console.log('   Correct Q1 = 84,951.76€  |  Simulation = 85,286.75€');
  console.log('   Excès = 334.99€ → achats trop bas de 334.99€ dans DB');
  console.log('══════════════════════════════════════════════════════════');

  for (const invNum of ['ITC-2023-007', 'ITC-2023-008']) {
    const { data: inv } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_date, amount, contract_id, billing_data')
      .eq('invoice_number', invNum)
      .single();

    if (!inv) { console.log(`\n  ${invNum}: introuvable`); continue; }

    console.log(`\n  ${invNum} (contrat ${inv.contract_id?.substring(0,8)}…) :`);
    console.log(`    invoice_date = ${inv.invoice_date}  montant = ${inv.amount}€`);

    if (inv.contract_id) {
      const { data: ceRows } = await sb
        .from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date')
        .eq('contract_id', inv.contract_id);

      const total = (ceRows||[]).reduce(
        (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity||1), 0
      );
      console.log(`    contract_equipment : ${ceRows?.length || 0} lignes, total=${total.toFixed(2)}€`);
      for (const e of ceRows||[]) {
        const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
        console.log(`      - ${(e.title||'?').substring(0,40).padEnd(40)} qty=${e.quantity}  pp=${pp.toFixed(2).padStart(10)}€`);
      }
    }

    // Aussi billing_data
    const eqData = inv.billing_data?.equipment_data || [];
    if (eqData.length) {
      const bdTotal = eqData.reduce((s, e) => s + (parseFloat(e.purchase_price)||0)*(parseFloat(e.quantity)||1), 0);
      console.log(`    billing_data.equipment_data : ${eqData.length} items, total=${bdTotal.toFixed(2)}€`);
    }
  }

  // ── 3. Août : détail par dossier ──────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('3. AOÛT — dossiers et achats corrects attendus :');
  console.log('   Dashboard : CA=9509.14€  Achats=6730.50€  Marge=2778.64€');
  console.log('   Référence : CA=9509.14€  Achats=?5809.00€ Marge=3700.14€');
  console.log('   Excès achats DB vs correct : +921.50€');
  console.log('══════════════════════════════════════════════════════════');

  const aoutDossiers = allDossiers.filter(d => d.month_invoice === 8);
  console.log(`\n  ${aoutDossiers.length} dossier(s) Août dans le dataset :`);
  for (const d of aoutDossiers) {
    console.log(`\n  📁 ${d.dossier_number} (${d.client_name}) :`);
    console.log(`     Dataset → ca=${d.ca}€  achat=${d.achat}€  marge=${d.marge}€  invoice=${d.invoice_number}`);

    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', d.dossier_number);
    if (!offers?.length) { console.log('     ❌ Offre introuvable'); continue; }
    const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offers.map(o => o.id));
    if (!contracts?.length) { console.log('     ❌ Contrat introuvable'); continue; }

    // Invoice
    const { data: invs } = await sb.from('invoices')
      .select('id, invoice_number, invoice_date, amount, contract_id')
      .in('contract_id', contracts.map(c => c.id));

    for (const inv of invs || []) {
      // CE
      const { data: ceRows } = await sb.from('contract_equipment')
        .select('actual_purchase_price, purchase_price, quantity, title')
        .eq('contract_id', inv.contract_id || contracts[0].id);
      const ceTotal = (ceRows||[]).reduce(
        (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity||1), 0
      );
      console.log(`     Invoice ${inv.invoice_number} → montant=${(inv.amount||0).toFixed(2)}€  CE total=${ceTotal.toFixed(2)}€  (dataset achat=${d.achat}€)`);
      for (const e of ceRows||[]) {
        const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
        console.log(`       - ${(e.title||'?').substring(0,40).padEnd(40)} qty=${e.quantity}  pp=${pp.toFixed(2)}€`);
      }
    }
  }

  // ── 4. Check ITC-2023-005 invoice_type ───────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('4. ITC-2023-005 (180-17880 Dav Constructance) — détail :');
  console.log('══════════════════════════════════════════════════════════');

  const { data: inv005 } = await sb.from('invoices')
    .select('id, invoice_number, invoice_date, amount, invoice_type, contract_id, company_id, status')
    .eq('invoice_number', 'ITC-2023-005')
    .single();

  if (inv005) {
    console.log(`  invoice_number : ${inv005.invoice_number}`);
    console.log(`  invoice_type   : ${inv005.invoice_type}`);
    console.log(`  invoice_date   : ${inv005.invoice_date}`);
    console.log(`  amount         : ${inv005.amount}€`);
    console.log(`  status         : ${inv005.status}`);
    console.log(`  company_id     : ${inv005.company_id}`);
    console.log(`  contract_id    : ${inv005.contract_id}`);

    // Compare company_id
    if (inv005.company_id === COMPANY_ID) {
      console.log(`  ✅ company_id correct`);
    } else {
      console.log(`  ❌ company_id WRONG: ${inv005.company_id} vs ${COMPANY_ID}`);
    }
  } else {
    console.log('  Introuvable !');
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
