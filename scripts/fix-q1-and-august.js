/**
 * fix-q1-and-august.js
 *
 * Correctifs :
 *
 *  FIX 1 – Février Q1 : ITC-2023-007 (PP) → Patrick Malin #2 (180-18263)
 *    DB actuel  : 22 200,00€  (valeur incorrecte)
 *    Correct    : 22 499,70€  (source : Excel iTakecare)
 *    → Augmentation de +299,70€ via ratio sur contract_equipment
 *
 *  FIX 2 – Août : ITC-2023-0036 → Davy Loomans / JNS Lightning (180-19681)
 *    DB actuel  : 4 070,00€  (valeur incorrecte du dataset)
 *    Correct    : 3 111,50€  (source : tableau iTakecare)
 *
 *  FIX 3 – Août : ITC-2023-0037 → William Elong / Faraday Scomm (180-19695)
 *    DB actuel  : 2 660,50€  (valeur incorrecte du dataset)
 *    Correct    : 2 697,50€  (source : tableau iTakecare)
 *
 * Usage :
 *   node scripts/fix-q1-and-august.js --dry-run
 *   node scripts/fix-q1-and-august.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const FIXES = [
  {
    label:         'Février Q1 — ITC-2023-007 (PP) Patrick Malin #2',
    invoice_search: ['ITC-2023-007', 'ITC-2023-007 (PP)'],
    dossier:       '180-18263',
    correct_total:  22499.70,
  },
  {
    label:         'Août — ITC-2023-0036 Davy Loomans / JNS Lightning',
    invoice_search: ['ITC-2023-0036'],
    dossier:       '180-19681',
    correct_total:  3111.50,
  },
  {
    label:         'Août — ITC-2023-0037 William Elong / Faraday Scomm',
    invoice_search: ['ITC-2023-0037'],
    dossier:       '180-19695',
    correct_total:  2697.50,
  },
];

async function applyRatioFix(contractId, correctTotal, label) {
  const { data: ceRows, error } = await sb.from('contract_equipment')
    .select('id, title, quantity, purchase_price, actual_purchase_price')
    .eq('contract_id', contractId);

  if (error || !ceRows?.length) {
    console.log(`  ❌ Aucun contract_equipment pour contract ${contractId.substring(0,8)}: ${error?.message||'vide'}`);
    return;
  }

  const currentTotal = ceRows.reduce(
    (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
  );

  const diff = Math.round((currentTotal - correctTotal) * 100) / 100;
  console.log(`  DB total: ${currentTotal.toFixed(2)}€  →  Cible: ${correctTotal.toFixed(2)}€  (diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}€)`);

  if (Math.abs(diff) < 0.01) {
    console.log(`  ✅ Déjà correct`);
    return;
  }

  const ratio = correctTotal / currentTotal;
  let runningTotal = 0;

  const updates = ceRows.map((e, i) => {
    const oldPP = e.actual_purchase_price ?? e.purchase_price ?? 0;
    let newPP;
    if (i === ceRows.length - 1) {
      // Last item: adjust to hit exact target
      newPP = Math.round(((correctTotal - runningTotal) / (e.quantity || 1)) * 100) / 100;
    } else {
      newPP = Math.round(oldPP * ratio * 100) / 100;
      runningTotal += newPP * (e.quantity || 1);
    }
    return { id: e.id, title: e.title, qty: e.quantity || 1, oldPP, newPP };
  });

  for (const u of updates) {
    const prefix = DRY_RUN ? '[DRY] ' : '      ';
    console.log(`  ${prefix}${(u.title||'?').substring(0,40).padEnd(40)} qty=${u.qty}  ${u.oldPP.toFixed(2).padStart(9)}€ → ${u.newPP.toFixed(2).padStart(9)}€`);
    if (!DRY_RUN) {
      const { error: updErr } = await sb.from('contract_equipment')
        .update({ actual_purchase_price: u.newPP, updated_at: new Date().toISOString() })
        .eq('id', u.id);
      if (updErr) console.log(`  ❌ ${updErr.message}`);
    }
  }

  const verifyTotal = updates.reduce((s, u) => s + u.newPP * u.qty, 0);
  console.log(`  → Vérif total: ${verifyTotal.toFixed(2)}€ (cible: ${correctTotal.toFixed(2)}€)`);
}

async function findContractForInvoice(invoiceNumbers, dossierNumber) {
  // Try by invoice_number (multiple possible formats)
  for (const invNum of invoiceNumbers) {
    const { data: inv } = await sb.from('invoices')
      .select('id, invoice_number, contract_id, amount, invoice_date')
      .eq('invoice_number', invNum)
      .limit(1)
      .maybeSingle();

    if (inv?.contract_id) {
      console.log(`  ✅ Trouvé via invoice_number="${invNum}" → contract=${inv.contract_id.substring(0,8)}…`);
      console.log(`     invoice_date=${inv.invoice_date?.substring(0,10)}  amount=${inv.amount}€`);
      return inv.contract_id;
    }
  }

  // Try by dossier_number → offers → contracts → invoices
  console.log(`  ⚠️  Pas trouvé par invoice_number, essai par dossier_number=${dossierNumber}`);
  const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', dossierNumber);
  if (!offers?.length) {
    console.log(`  ❌ Offre introuvable pour ${dossierNumber}`);
    return null;
  }
  const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offers.map(o => o.id));
  if (!contracts?.length) {
    console.log(`  ❌ Contrat introuvable pour ${dossierNumber}`);
    return null;
  }

  // Find the invoice among those contracts
  const { data: invoices } = await sb.from('invoices')
    .select('id, invoice_number, contract_id, amount, invoice_date')
    .in('contract_id', contracts.map(c => c.id))
    .limit(1);

  if (invoices?.[0]?.contract_id) {
    console.log(`  ✅ Trouvé via dossier → contract=${invoices[0].contract_id.substring(0,8)}…`);
    return invoices[0].contract_id;
  }

  console.log(`  ❌ Aucun contrat/invoice trouvé pour ${dossierNumber}`);
  return null;
}

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN — aucune modification appliquée\n');
  else console.log('\n🔧 APPLICATION DES CORRECTIFS\n');

  for (const fix of FIXES) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`🔧 ${fix.label}`);
    console.log(`   Cible: ${fix.correct_total.toFixed(2)}€`);
    console.log(`${'═'.repeat(65)}`);

    const contractId = await findContractForInvoice(fix.invoice_search, fix.dossier);
    if (!contractId) continue;

    await applyRatioFix(contractId, fix.correct_total, fix.label);
  }

  // ── Vérification finale ─────────────────────────────────────────────────
  if (!DRY_RUN) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log('📊 VÉRIFICATION FINALE :');
    console.log(`${'═'.repeat(65)}`);

    const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
    const { data: invoices2023 } = await sb.from('invoices')
      .select('id, invoice_number, invoice_date, amount, credited_amount, contract_id')
      .eq('company_id', COMPANY_ID)
      .gte('invoice_date', '2023-01-01')
      .lte('invoice_date', '2023-12-31');

    const contractIds = [...new Set((invoices2023||[]).map(i => i.contract_id).filter(Boolean))];
    const { data: allCE } = await sb.from('contract_equipment')
      .select('contract_id, actual_purchase_price, purchase_price, quantity')
      .in('contract_id', contractIds);

    const ceByContract = {};
    for (const e of allCE || []) {
      if (!ceByContract[e.contract_id]) ceByContract[e.contract_id] = 0;
      ceByContract[e.contract_id] += (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1);
    }

    let q1Rev = 0, q1Pur = 0, augRev = 0, augPur = 0;
    for (const inv of invoices2023 || []) {
      const m = new Date(inv.invoice_date).getUTCMonth() + 1;
      const rev = (inv.amount || 0) - (inv.credited_amount || 0);
      let pur = 0;
      if ((inv.credited_amount || 0) >= (inv.amount || 0)) {
        pur = 0;
      } else if (inv.contract_id) {
        pur = (ceByContract[inv.contract_id] || 0) *
              (1 - (inv.credited_amount || 0) / Math.max(inv.amount || 1, 0.01));
      }
      if (m <= 3) { q1Rev += rev; q1Pur += pur; }
      if (m === 8) { augRev += rev; augPur += pur; }
    }

    console.log(`\n  Q1 (Jan-Mar) :`);
    console.log(`    CA       = ${q1Rev.toFixed(2)}€`);
    console.log(`    Achats   = ${q1Pur.toFixed(2)}€`);
    console.log(`    Marge    = ${(q1Rev - q1Pur).toFixed(2)}€  (cible: 84 951,76€  diff: ${((q1Rev - q1Pur) - 84951.76).toFixed(2)}€)`);

    console.log(`\n  Août :`);
    console.log(`    CA       = ${augRev.toFixed(2)}€`);
    console.log(`    Achats   = ${augPur.toFixed(2)}€`);
    console.log(`    Marge    = ${(augRev - augPur).toFixed(2)}€  (cible: 3 700,14€  diff: ${((augRev - augPur) - 3700.14).toFixed(2)}€)`);
  }

  console.log(`\n${'═'.repeat(65)}`);
  if (DRY_RUN) console.log('Dry-run terminé. Relancer sans --dry-run pour appliquer.');
  else console.log('✅ Correctifs appliqués !');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
