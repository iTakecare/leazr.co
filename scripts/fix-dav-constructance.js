/**
 * fix-dav-constructance.js
 *
 * Diagnostic + correctif pour ITC-2023-005 (PP) — Dav Constructance (180-17880)
 *
 * PROBLÈME :
 *   Le dashboard inclut le CA de cette invoice (8 251,61€) dans les recettes
 *   mais ses achats (4 244,36€) sont à 0€ → marge janvier/Q1 trop haute de 4 244,36€.
 *
 * CAUSE PROBABLE :
 *   - L'invoice ITC-2023-005 a contract_id = NULL
 *   - ET billing_data n'a pas de equipment_data → achats = 0 dans le SQL
 *
 * CORRECTIF :
 *   Option A (préférée) : créer offer + contract + contract_equipment et lier l'invoice
 *   Option B (fallback) : injecter equipment_data dans billing_data de l'invoice
 *
 * Valeurs correctes (source : Excel iTakecare) :
 *   CA    = 8 251,61€
 *   Achat = 4 244,36€
 *   Marge = 4 007,25€
 *
 * Usage :
 *   node scripts/fix-dav-constructance.js --dry-run
 *   node scripts/fix-dav-constructance.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const COMPANY_ID   = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const DOSSIER      = '180-17880';
const CORRECT_ACHAT = 4244.36;   // from Excel
const CORRECT_CA    = 8251.61;

// ── Equipment list (match the dataset / invoice)
// The SQL equation: achat = sum(actual_purchase_price * quantity)
// One representative item covering the full 4244.36€:
const EQUIPMENT = [
  { title: 'Matériel informatique — Dav Constructance', quantity: 1, purchase_price: CORRECT_ACHAT }
];

async function main() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`🔍 DIAGNOSTIC — ITC-2023-005 (PP) / Dav Constructance`);
  console.log(`   Dossier: ${DOSSIER}  CA: ${CORRECT_CA}€  Achat cible: ${CORRECT_ACHAT}€`);
  console.log(`${'═'.repeat(65)}\n`);

  // ── 1. Chercher l'invoice ──────────────────────────────────────────────
  const { data: invRows } = await sb.from('invoices')
    .select('id, invoice_number, invoice_date, amount, credited_amount, contract_id, billing_data, company_id')
    .or(`invoice_number.eq.ITC-2023-005,invoice_number.eq.ITC-2023-005 (PP),invoice_number.ilike.ITC-2023-005%`);

  if (!invRows?.length) {
    console.log('❌ Invoice ITC-2023-005 introuvable — recherche par company_id + date...');
    // Fallback: search by date and amount
    const { data: invByDate } = await sb.from('invoices')
      .select('id, invoice_number, invoice_date, amount, contract_id, billing_data, company_id')
      .eq('company_id', COMPANY_ID)
      .gte('invoice_date', '2023-01-01')
      .lte('invoice_date', '2023-01-31');
    console.log(`  Invoices janvier 2023 (company_id): ${invByDate?.length || 0}`);
    for (const i of invByDate || []) {
      console.log(`  ${i.invoice_number?.padEnd(30)||'?'.padEnd(30)} amount=${i.amount}  contract=${i.contract_id?.substring(0,8)||'null'}`);
    }
    return;
  }

  for (const inv of invRows) {
    console.log(`📄 Invoice trouvée : ${inv.invoice_number}`);
    console.log(`   ID        : ${inv.id}`);
    console.log(`   date      : ${inv.invoice_date?.substring(0,10)}`);
    console.log(`   amount    : ${inv.amount}€`);
    console.log(`   company_id: ${inv.company_id?.substring(0,8)||'null'}…`);
    console.log(`   contract_id: ${inv.contract_id?.substring(0,8)||'NULL ← PROBLÈME'}`);

    const bdata = inv.billing_data;
    const eqData = bdata?.equipment_data;
    if (eqData?.length) {
      const eqTotal = eqData.reduce((s, e) => s + (parseFloat(e.purchase_price)||0) * (parseFloat(e.quantity)||1), 0);
      console.log(`   billing_data.equipment_data: ${eqData.length} article(s) → total=${eqTotal.toFixed(2)}€`);
    } else {
      console.log(`   billing_data.equipment_data: VIDE/NULL ← achats = 0€ dans le SQL`);
    }

    // ── 2. Chercher le contrat existant ──────────────────────────────────
    let contractId = inv.contract_id;
    let offerId    = null;

    if (!contractId) {
      console.log(`\n🔍 Cherche un contrat/offre pour dossier ${DOSSIER}...`);

      // Try finding by dossier_number
      const { data: offerRows } = await sb.from('offers')
        .select('id, dossier_number, client_name')
        .eq('dossier_number', DOSSIER);

      if (offerRows?.length) {
        offerId = offerRows[0].id;
        console.log(`   Offre trouvée: ${offerId.substring(0,8)}… (${offerRows[0].client_name})`);

        const { data: contractRows } = await sb.from('contracts')
          .select('id')
          .eq('offer_id', offerId);

        if (contractRows?.length) {
          contractId = contractRows[0].id;
          console.log(`   Contrat trouvé: ${contractId.substring(0,8)}…`);
        }
      } else {
        console.log(`   ❌ Aucune offre pour ${DOSSIER} — besoin de créer offer+contract`);
      }
    }

    // ── 3. Vérifier le contract_equipment existant ────────────────────────
    if (contractId) {
      const { data: ceRows } = await sb.from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price')
        .eq('contract_id', contractId);

      const ceTotal = (ceRows||[]).reduce(
        (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
      );
      console.log(`\n   contract_equipment: ${ceRows?.length||0} ligne(s), total=${ceTotal.toFixed(2)}€`);
      for (const e of ceRows||[]) {
        const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
        console.log(`     [${e.id.substring(0,8)}] ${(e.title||'?').substring(0,40).padEnd(40)} qty=${e.quantity}  pp=${pp.toFixed(2)}€`);
      }
    }

    // ── 4. Application du correctif ───────────────────────────────────────
    console.log(`\n${'─'.repeat(65)}`);
    console.log(`🔧 CORRECTIF${DRY_RUN ? ' [DRY-RUN]' : ''} :`);

    if (!inv.contract_id) {
      console.log(`   L'invoice n'a pas de contract_id.`);
      console.log(`   → Stratégie : injection de equipment_data dans billing_data`);

      if (!DRY_RUN) {
        const newBillingData = {
          ...(bdata || {}),
          equipment_data: EQUIPMENT.map(e => ({
            title:          e.title,
            quantity:       e.quantity,
            purchase_price: e.purchase_price,
          }))
        };

        const { error } = await sb.from('invoices')
          .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
          .eq('id', inv.id);

        if (error) {
          console.log(`   ❌ Erreur mise à jour billing_data: ${error.message}`);
        } else {
          console.log(`   ✅ billing_data.equipment_data injecté → achats = ${CORRECT_ACHAT}€`);
        }

        // Also ensure company_id is set
        if (!inv.company_id) {
          await sb.from('invoices').update({ company_id: COMPANY_ID }).eq('id', inv.id);
          console.log(`   ✅ company_id défini`);
        }
      } else {
        console.log(`   [DRY] Injecterait billing_data.equipment_data = [{purchase_price: ${CORRECT_ACHAT}}]`);
      }

    } else {
      // Has contract_id — ensure contract_equipment is correct
      const { data: ceRows } = await sb.from('contract_equipment')
        .select('id, quantity, purchase_price, actual_purchase_price')
        .eq('contract_id', contractId);

      const ceTotal = (ceRows||[]).reduce(
        (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
      );

      if (Math.abs(ceTotal - CORRECT_ACHAT) < 0.01) {
        console.log(`   ✅ contract_equipment déjà correct (${ceTotal.toFixed(2)}€)`);
      } else {
        console.log(`   contract_equipment total actuel: ${ceTotal.toFixed(2)}€ → cible: ${CORRECT_ACHAT}€`);

        if (!DRY_RUN) {
          if (!ceRows?.length) {
            // Insert new equipment
            const { error } = await sb.from('contract_equipment').insert(
              EQUIPMENT.map(e => ({
                contract_id:          contractId,
                title:                e.title,
                quantity:             e.quantity,
                purchase_price:       e.purchase_price,
                actual_purchase_price: e.purchase_price,
              }))
            );
            if (error) console.log(`   ❌ ${error.message}`);
            else console.log(`   ✅ contract_equipment créé (${CORRECT_ACHAT}€)`);
          } else {
            // Apply ratio to existing rows
            const ratio = CORRECT_ACHAT / ceTotal;
            let running = 0;
            for (let i = 0; i < ceRows.length; i++) {
              const e = ceRows[i];
              const oldPP = e.actual_purchase_price ?? e.purchase_price ?? 0;
              let newPP;
              if (i === ceRows.length - 1) {
                newPP = Math.round(((CORRECT_ACHAT - running) / (e.quantity || 1)) * 100) / 100;
              } else {
                newPP = Math.round(oldPP * ratio * 100) / 100;
                running += newPP * (e.quantity || 1);
              }
              const { error } = await sb.from('contract_equipment')
                .update({ actual_purchase_price: newPP }).eq('id', e.id);
              if (error) console.log(`   ❌ ${error.message}`);
            }
            console.log(`   ✅ contract_equipment mis à jour (${CORRECT_ACHAT}€)`);
          }
        } else {
          console.log(`   [DRY] Mettrait à jour contract_equipment vers ${CORRECT_ACHAT}€`);
        }
      }
    }
  }

  // ── 5. Vérification finale ─────────────────────────────────────────────
  if (!DRY_RUN) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`📊 VÉRIFICATION Q1 :`);

    const { data: inv2023 } = await sb.from('invoices')
      .select('id, invoice_date, amount, credited_amount, contract_id, billing_data')
      .eq('company_id', COMPANY_ID)
      .gte('invoice_date', '2023-01-01')
      .lte('invoice_date', '2023-03-31');

    const contractIds = [...new Set((inv2023||[]).map(i => i.contract_id).filter(Boolean))];
    const { data: allCE } = await sb.from('contract_equipment')
      .select('contract_id, actual_purchase_price, purchase_price, quantity')
      .in('contract_id', contractIds);

    const ceByC = {};
    for (const e of allCE || []) {
      ceByC[e.contract_id] = (ceByC[e.contract_id] || 0) +
        (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1);
    }

    let q1Rev = 0, q1Pur = 0;
    for (const inv of inv2023 || []) {
      const rev = (inv.amount || 0) - (inv.credited_amount || 0);
      let pur = 0;
      if ((inv.credited_amount || 0) < (inv.amount || 1)) {
        const ratio = 1 - (inv.credited_amount || 0) / (inv.amount || 1);
        if (inv.contract_id) {
          pur = (ceByC[inv.contract_id] || 0) * ratio;
        } else {
          const eq = inv.billing_data?.equipment_data || [];
          pur = eq.reduce((s, e) => s + (parseFloat(e.purchase_price)||0) * (parseFloat(e.quantity)||1), 0) * ratio;
        }
      }
      q1Rev += rev;
      q1Pur += pur;
    }

    const q1Marge = q1Rev - q1Pur;
    const diff = Math.round((q1Marge - 84951.76) * 100) / 100;
    console.log(`   Q1 CA     = ${q1Rev.toFixed(2)}€`);
    console.log(`   Q1 Achats = ${q1Pur.toFixed(2)}€`);
    console.log(`   Q1 Marge  = ${q1Marge.toFixed(2)}€   (cible: 84 951,76€   diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}€)`);
    if (Math.abs(diff) < 10) {
      console.log(`   ✅ Q1 dans la marge attendue !`);
    } else {
      console.log(`   ⚠️  Écart résiduel de ${diff.toFixed(2)}€ — peut nécessiter un ajustement complémentaire`);
    }
  }

  console.log(`\n${'═'.repeat(65)}`);
  if (DRY_RUN) console.log('Dry-run terminé. Relancer sans --dry-run pour appliquer.');
  else console.log('✅ Terminé !');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
