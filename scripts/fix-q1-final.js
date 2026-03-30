/**
 * fix-q1-final.js
 *
 * Correctifs finaux Q1 2023 — source de vérité : colonne "Marge en € HTVA" du tableau Excel
 *
 * DIAGNOSTIC :
 *   Cible user          = 84 951,76€
 *   CA - Achat (simple) = 84 987,08€
 *   Écart               = +35,32€ dû à 2 records + 180-17880 non comptabilisé
 *
 * FIX 1 — 180-17880 Dav Constructance (ITC-2023-005 PP)
 *   Purchases = 0€ dans le dashboard (invoice sans contract_id ni billing_data.equipment_data)
 *   → Achat correct : 4 244,36€
 *   → Action : injecter billing_data.equipment_data sur l'invoice
 *
 * FIX 2 — 180-18149 Marie Sergi (ITC-2023-0007)
 *   Achat Excel (col 16)     = 480,00€
 *   Achat implicite (marge)  = CA - marge = 879,12 - 197,02 = 682,10€
 *   → Augmenter de +202,10€
 *
 * FIX 3 — 180-18263 Patrick Malin #2 (ITC-2023-007 PP)
 *   Achat actuel DB          = 22 499,70€ (après fix précédent)
 *   Achat implicite (marge)  = 34 533,15 - 12 200,23 = 22 332,92€
 *   → Réduire de -166,78€
 *
 * Résultat attendu : Q1 marge = 84 951,76€ ✅
 *
 * Usage :
 *   node scripts/fix-q1-final.js --dry-run
 *   node scripts/fix-q1-final.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findInvoice(invoiceNumbers) {
  for (const num of invoiceNumbers) {
    const { data } = await sb.from('invoices')
      .select('id, invoice_number, invoice_date, amount, credited_amount, contract_id, billing_data, company_id')
      .eq('invoice_number', num)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function getCETotal(contractId) {
  const { data } = await sb.from('contract_equipment')
    .select('id, title, quantity, purchase_price, actual_purchase_price')
    .eq('contract_id', contractId);
  const total = (data||[]).reduce(
    (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
  );
  return { rows: data||[], total };
}

async function applyRatioToCE(contractId, correctTotal, label) {
  const { rows, total } = await getCETotal(contractId);
  if (!rows.length) {
    console.log(`  ❌ Aucun contract_equipment pour ${label}`);
    return false;
  }
  console.log(`  CE actuel: ${total.toFixed(2)}€ → cible: ${correctTotal.toFixed(2)}€ (diff: ${(correctTotal-total).toFixed(2)}€)`);
  const ratio = correctTotal / total;
  let running = 0;
  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];
    const oldPP = e.actual_purchase_price ?? e.purchase_price ?? 0;
    let newPP;
    if (i === rows.length - 1) {
      newPP = Math.round(((correctTotal - running) / (e.quantity||1)) * 100) / 100;
    } else {
      newPP = Math.round(oldPP * ratio * 100) / 100;
      running += newPP * (e.quantity||1);
    }
    const prefix = DRY_RUN ? '  [DRY] ' : '        ';
    console.log(`${prefix}${(e.title||'?').substring(0,40).padEnd(40)} qty=${e.quantity}  ${oldPP.toFixed(2)}€ → ${newPP.toFixed(2)}€`);
    if (!DRY_RUN) {
      await sb.from('contract_equipment')
        .update({ actual_purchase_price: newPP, updated_at: new Date().toISOString() })
        .eq('id', e.id);
    }
  }
  return true;
}

// ─── FIX 1 : Dav Constructance (180-17880, ITC-2023-005 PP) ─────────────────

async function fix180_17880() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`🔧 FIX 1 — 180-17880 Dav Constructance (ITC-2023-005 PP)`);
  console.log(`   Achats manquants dans le dashboard : 4 244,36€`);
  console.log(`${'═'.repeat(65)}`);

  const CORRECT_ACHAT = 4244.36;

  // Search in all invoices (with or without company_id)
  const invNums = ['ITC-2023-005', 'ITC-2023-005 (PP)'];
  let inv = await findInvoice(invNums);

  if (!inv) {
    // Fallback: search by dossier 180-17880 → offer → contract → invoice
    console.log('  Recherche par dossier_number...');
    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', '180-17880');
    if (offers?.length) {
      const { data: contracts } = await sb.from('contracts').select('id').eq('offer_id', offers[0].id);
      if (contracts?.length) {
        const { data: invByContract } = await sb.from('invoices')
          .select('id, invoice_number, invoice_date, amount, contract_id, billing_data, company_id')
          .eq('contract_id', contracts[0].id)
          .limit(1);
        if (invByContract?.length) inv = invByContract[0];
      }
    }
  }

  if (!inv) {
    // Last resort: all January 2023 invoices, find by amount
    console.log('  Recherche par montant (8251.61€) dans jan 2023...');
    const { data: janInvs } = await sb.from('invoices')
      .select('id, invoice_number, invoice_date, amount, contract_id, billing_data, company_id')
      .gte('invoice_date', '2023-01-01')
      .lte('invoice_date', '2023-01-31');
    inv = janInvs?.find(i => Math.abs((i.amount||0) - 8251.61) < 0.01) || null;
  }

  if (!inv) {
    console.log('  ❌ Invoice ITC-2023-005 introuvable !');
    return;
  }

  console.log(`  ✅ Invoice: ${inv.invoice_number} | date=${inv.invoice_date?.substring(0,10)} | amount=${inv.amount}€`);
  console.log(`     contract_id: ${inv.contract_id?.substring(0,8)||'NULL'}`);

  if (inv.contract_id) {
    // Check existing contract_equipment
    const { rows, total } = await getCETotal(inv.contract_id);
    console.log(`     CE: ${rows.length} lignes, total=${total.toFixed(2)}€`);
    if (Math.abs(total - CORRECT_ACHAT) < 0.01) {
      // Check if company_id is set, if so already correct
      if (inv.company_id) {
        console.log('  ✅ Déjà correct (CE total = cible ET company_id défini)');
        console.log('  ⚠️  Si le dashboard n\'inclut toujours pas cet achat, vérifier le SQL function.');
        return;
      }
    }
    if (rows.length && Math.abs(total - CORRECT_ACHAT) >= 0.01) {
      await applyRatioToCE(inv.contract_id, CORRECT_ACHAT, '180-17880');
    }
  } else {
    // No contract_id → inject billing_data.equipment_data
    console.log('  → Stratégie: injection billing_data.equipment_data');
    const eqData = inv.billing_data?.equipment_data;
    const eqTotal = (eqData||[]).reduce(
      (s, e) => s + (parseFloat(e.purchase_price)||0) * (parseFloat(e.quantity)||1), 0
    );
    console.log(`     billing_data.equipment_data actuel: ${eqData?.length||0} items, total=${eqTotal.toFixed(2)}€`);

    if (!DRY_RUN) {
      const newBD = {
        ...(inv.billing_data||{}),
        equipment_data: [{
          title:          'Matériel informatique — Dav Constructance (ITC-2023-005)',
          quantity:       1,
          purchase_price: CORRECT_ACHAT,
        }]
      };
      const updates = { billing_data: newBD, updated_at: new Date().toISOString() };
      if (!inv.company_id) updates.company_id = COMPANY_ID;

      const { error } = await sb.from('invoices').update(updates).eq('id', inv.id);
      if (error) console.log(`  ❌ ${error.message}`);
      else {
        console.log(`  ✅ billing_data.equipment_data = [${CORRECT_ACHAT}€]`);
        if (!inv.company_id) console.log('  ✅ company_id défini');
      }
    } else {
      console.log(`  [DRY] Injecterait billing_data.equipment_data = [{${CORRECT_ACHAT}}]`);
      if (!inv.company_id) console.log('  [DRY] Définirait company_id');
    }
  }
}

// ─── FIX 2 : Marie Sergi (180-18149, ITC-2023-0007) ─────────────────────────

async function fix180_18149() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`🔧 FIX 2 — 180-18149 Marie Sergi (ITC-2023-0007)`);
  console.log(`   Achat col Excel: 480,00€ | Achat implicite (CA-marge): 682,10€`);
  console.log(`   Ajustement: +202,10€`);
  console.log(`${'═'.repeat(65)}`);

  const CORRECT_ACHAT = 682.10;  // CA(879.12) - Marge_Excel(197.02) = 682.10

  const inv = await findInvoice(['ITC-2023-0007']);
  if (!inv) { console.log('  ❌ Invoice ITC-2023-0007 introuvable'); return; }

  console.log(`  ✅ Invoice: ${inv.invoice_number} | amount=${inv.amount}€ | contract=${inv.contract_id?.substring(0,8)||'null'}`);

  if (inv.contract_id) {
    await applyRatioToCE(inv.contract_id, CORRECT_ACHAT, '180-18149');
  } else {
    const eqData = inv.billing_data?.equipment_data || [];
    const eqTotal = eqData.reduce(
      (s, e) => s + (parseFloat(e.purchase_price)||0) * (parseFloat(e.quantity)||1), 0
    );
    console.log(`  billing_data.equipment_data: ${eqTotal.toFixed(2)}€ → cible: ${CORRECT_ACHAT.toFixed(2)}€`);
    if (!DRY_RUN) {
      let newEqData;
      if (eqData.length) {
        const ratio = CORRECT_ACHAT / eqTotal;
        newEqData = eqData.map((e, i) => ({
          ...e,
          purchase_price: i === eqData.length-1
            ? CORRECT_ACHAT - eqData.slice(0,i).reduce((s,x)=>s+(parseFloat(x.purchase_price)||0)*(parseFloat(x.quantity)||1),0)
            : Math.round(parseFloat(e.purchase_price)*ratio*100)/100
        }));
      } else {
        newEqData = [{ title: 'Marie Sergi — matériel (ITC-2023-0007)', quantity: 1, purchase_price: CORRECT_ACHAT }];
      }
      const { error } = await sb.from('invoices')
        .update({ billing_data: { ...(inv.billing_data||{}), equipment_data: newEqData } })
        .eq('id', inv.id);
      if (error) console.log(`  ❌ ${error.message}`);
      else console.log(`  ✅ billing_data.equipment_data mis à jour → ${CORRECT_ACHAT}€`);
    } else {
      console.log(`  [DRY] Mettrait à jour equipment_data → ${CORRECT_ACHAT}€`);
    }
  }
}

// ─── FIX 3 : Patrick Malin #2 (180-18263, ITC-2023-007 PP) ──────────────────

async function fix180_18263() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`🔧 FIX 3 — 180-18263 Patrick Malin #2 (ITC-2023-007 PP)`);
  console.log(`   Achat actuel DB: 22 499,70€ | Achat implicite (CA-marge): 22 332,92€`);
  console.log(`   Ajustement: -166,78€`);
  console.log(`${'═'.repeat(65)}`);

  const CORRECT_ACHAT = 22332.92;  // CA(34533.15) - Marge_Excel(12200.23) = 22332.92

  const inv = await findInvoice(['ITC-2023-007', 'ITC-2023-007 (PP)']);
  if (!inv) { console.log('  ❌ Invoice ITC-2023-007 introuvable'); return; }

  console.log(`  ✅ Invoice: ${inv.invoice_number} | amount=${inv.amount}€ | contract=${inv.contract_id?.substring(0,8)||'null'}`);

  if (inv.contract_id) {
    await applyRatioToCE(inv.contract_id, CORRECT_ACHAT, '180-18263');
  } else {
    const eqData = inv.billing_data?.equipment_data || [];
    const eqTotal = eqData.reduce(
      (s, e) => s + (parseFloat(e.purchase_price)||0) * (parseFloat(e.quantity)||1), 0
    );
    console.log(`  billing_data.equipment_data: ${eqTotal.toFixed(2)}€ → cible: ${CORRECT_ACHAT.toFixed(2)}€`);
    if (!DRY_RUN) {
      let newEqData;
      if (eqData.length) {
        const ratio = CORRECT_ACHAT / eqTotal;
        let running = 0;
        newEqData = eqData.map((e, i) => {
          const pp = i === eqData.length-1
            ? Math.round(((CORRECT_ACHAT - running)/(parseFloat(e.quantity)||1))*100)/100
            : Math.round(parseFloat(e.purchase_price)*ratio*100)/100;
          running += pp*(parseFloat(e.quantity)||1);
          return { ...e, purchase_price: pp };
        });
      } else {
        newEqData = [{ title: 'Patrick Malin #2 — matériel (ITC-2023-007 PP)', quantity: 1, purchase_price: CORRECT_ACHAT }];
      }
      const { error } = await sb.from('invoices')
        .update({ billing_data: { ...(inv.billing_data||{}), equipment_data: newEqData } })
        .eq('id', inv.id);
      if (error) console.log(`  ❌ ${error.message}`);
      else console.log(`  ✅ billing_data.equipment_data mis à jour → ${CORRECT_ACHAT}€`);
    } else {
      console.log(`  [DRY] Mettrait à jour equipment_data → ${CORRECT_ACHAT}€`);
    }
  }
}

// ─── Vérification finale ──────────────────────────────────────────────────────

async function verifyQ1() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`📊 VÉRIFICATION Q1 2023 :`);
  console.log(`${'═'.repeat(65)}`);

  const { data: inv2023 } = await sb.from('invoices')
    .select('id, invoice_number, invoice_date, amount, credited_amount, contract_id, billing_data, company_id')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-03-31');

  const contractIds = [...new Set((inv2023||[]).map(i => i.contract_id).filter(Boolean))];
  let ceByC = {};
  if (contractIds.length) {
    const { data: allCE } = await sb.from('contract_equipment')
      .select('contract_id, actual_purchase_price, purchase_price, quantity')
      .in('contract_id', contractIds);
    for (const e of allCE||[]) {
      ceByC[e.contract_id] = (ceByC[e.contract_id]||0) +
        (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity||1);
    }
  }

  let jan = { rev:0, pur:0 }, feb = { rev:0, pur:0 }, mar = { rev:0, pur:0 };
  for (const inv of inv2023||[]) {
    const m = new Date(inv.invoice_date).getUTCMonth() + 1;
    const rev = (inv.amount||0) - (inv.credited_amount||0);
    let pur = 0;
    if ((inv.credited_amount||0) < (inv.amount||0.01)) {
      const r = 1 - (inv.credited_amount||0)/(inv.amount||1);
      if (inv.contract_id) {
        pur = (ceByC[inv.contract_id]||0) * r;
      } else {
        const eq = inv.billing_data?.equipment_data||[];
        pur = eq.reduce((s,e)=>(parseFloat(e.purchase_price)||0)*(parseFloat(e.quantity)||1)+s, 0) * r;
      }
    }
    if (m===1) { jan.rev+=rev; jan.pur+=pur; }
    if (m===2) { feb.rev+=rev; feb.pur+=pur; }
    if (m===3) { mar.rev+=rev; mar.pur+=pur; }
  }

  const months = [['Janvier', jan], ['Février', feb], ['Mars', mar]];
  let q1Rev=0, q1Pur=0;
  for (const [name, d] of months) {
    const marge = d.rev - d.pur;
    console.log(`  ${name.padEnd(8)}: CA=${d.rev.toFixed(2).padStart(11)}€  Achats=${d.pur.toFixed(2).padStart(11)}€  Marge=${marge.toFixed(2).padStart(11)}€`);
    q1Rev+=d.rev; q1Pur+=d.pur;
  }
  const q1Marge = q1Rev - q1Pur;
  const diff = Math.round((q1Marge - 84951.76)*100)/100;
  console.log(`  ${'─'.repeat(70)}`);
  console.log(`  Q1 total: CA=${q1Rev.toFixed(2).padStart(11)}€  Achats=${q1Pur.toFixed(2).padStart(11)}€  Marge=${q1Marge.toFixed(2).padStart(11)}€`);
  console.log(`\n  Cible    : 84 951,76€`);
  console.log(`  Résultat : ${q1Marge.toFixed(2)}€`);
  console.log(`  Écart    : ${diff>=0?'+':''}${diff.toFixed(2)}€ ${Math.abs(diff)<1?'✅':'⚠️'}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN — aucune modification appliquée\n');
  else         console.log('\n🔧 APPLICATION DES CORRECTIFS Q1 2023\n');

  await fix180_17880();  // Dav Constructance — achats manquants
  await fix180_18149();  // Marie Sergi       — achat 480→682,10
  await fix180_18263();  // Patrick Malin #2  — achat 22499,70→22332,92

  if (!DRY_RUN) await verifyQ1();

  console.log(`\n${'═'.repeat(65)}`);
  if (DRY_RUN) console.log('Dry-run terminé. Relancer sans --dry-run pour appliquer.');
  else console.log('✅ Correctifs appliqués !');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
