/**
 * fix-pa-leasing-2024.js
 *
 * Corrige les 3 dossiers dont le PA leasing est absent du calcul dashboard :
 *
 *  1. ITC-2024-0081 (Antoine Sottiaux / LeGrow Studio, 180-23893)
 *     → invoice.contract_id est null → contrat introuvable par le dashboard
 *     → cherche le contrat via offer_id et patch invoice.contract_id
 *     → vérifie contract_equipment (PA 1099€) et crée si manquant
 *
 *  2. ITC-2024-0073 (Choukri Skhiri / Prepalux, 180-23681)
 *     → contract existe et lié à l'invoice, mais sans contract_equipment
 *     → crée contract_equipment (PA 2094€)
 *
 *  3. ITC-2024-0074 (Julien Bombeke / Ropal Sécurité, 180-23894)
 *     → contract existe et lié à l'invoice, mais sans contract_equipment
 *     → crée contract_equipment (PA 442€)
 *
 * Usage :
 *   node scripts/fix-pa-leasing-2024.js --dry-run
 *   node scripts/fix-pa-leasing-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Dossiers à corriger avec leurs PA (source: CSV 2024-Tableau_1.csv)
const TARGETS = [
  { invoice_number: 'ITC-2024-0081', client: 'Antoine Sottiaux / LeGrow Studio',  purchase_price: 1099.00, fix_contract_id: true, dossier_number: '180-23893' },
  { invoice_number: 'ITC-2024-0073', client: 'Choukri Skhiri / Prepalux',          purchase_price: 2094.00, fix_contract_id: false },
  { invoice_number: 'ITC-2024-0074', client: 'Julien Bombeke / Ropal Sécurité',    purchase_price:  442.00, fix_contract_id: false },
];

async function main() {
  console.log(`\n🔧 FIX PA LEASING 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}\n`);

  let totalPAAdded = 0;

  for (const t of TARGETS) {
    console.log(`\n📋 ${t.invoice_number} | ${t.client} | PA à ajouter: ${t.purchase_price}€`);

    // Récupérer l'invoice
    const { data: invs } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_date, amount, offer_id, contract_id')
      .eq('company_id', COMPANY_ID)
      .eq('invoice_number', t.invoice_number);

    if (!invs?.length) { console.log('   ❌ Invoice introuvable'); continue; }
    const inv = invs[0];
    console.log(`   Invoice id=${inv.id} | offer_id=${inv.offer_id} | contract_id=${inv.contract_id || '(null)'}`);

    let contractId = inv.contract_id;

    // ── Étape 1 : fixer contract_id si null ──────────────────────────────
    if (t.fix_contract_id && !contractId) {
      let offerId = inv.offer_id;

      // Si offer_id manque sur l'invoice → chercher l'offer par dossier_number
      if (!offerId && t.dossier_number) {
        const { data: offers } = await sb
          .from('offers')
          .select('id, dossier_number, client_name')
          .eq('company_id', COMPANY_ID)
          .eq('dossier_number', t.dossier_number);
        if (offers?.length) {
          offerId = offers[0].id;
          console.log(`   → Offer trouvé par dossier_number=${t.dossier_number}: id=${offerId} | ${offers[0].client_name}`);
        } else {
          console.log(`   ❌ Aucun offer trouvé pour dossier_number=${t.dossier_number}`); continue;
        }
      }
      if (!offerId) { console.log('   ❌ offer_id null et pas de dossier_number de secours'); continue; }

      const { data: contracts } = await sb
        .from('contracts')
        .select('id, client_name')
        .eq('company_id', COMPANY_ID)
        .eq('offer_id', offerId);

      if (!contracts?.length) {
        // Pas de contrat → en créer un rattaché à l'offer
        console.log(`   ℹ️  Aucun contrat pour offer_id=${offerId} → création`);
        if (!DRY_RUN) {
          const { data: offerRow } = await sb.from('offers').select('client_name, leaser_id, contract_duration, financed_amount, created_at, user_id').eq('id', offerId).single();
          // Fallback user_id depuis profiles si l'offer n'en a pas
          let userId = offerRow?.user_id;
          if (!userId) {
            const { data: profile } = await sb.from('profiles').select('id').eq('email', 'hello@itakecare.be').single();
            userId = profile?.id;
          }
          const { data: newContract, error: cErr } = await sb.from('contracts').insert({
            company_id:          COMPANY_ID,
            user_id:             userId,
            offer_id:            offerId,
            client_name:         offerRow?.client_name || t.client,
            status:              'active',
            created_at:          inv.invoice_date,
            updated_at:          inv.invoice_date,
            monthly_payment:     0,
            leaser_name:         'Grenke',
            leaser_id:           offerRow?.leaser_id || null,
            contract_start_date: inv.invoice_date,
            contract_duration:   offerRow?.contract_duration || 48,
            dossier_date:        inv.invoice_date,
            invoice_generated:   true,
            invoice_date:        inv.invoice_date,
          }).select('id').single();
          if (cErr) { console.log(`   ❌ Création contrat: ${cErr.message}`); continue; }
          contractId = newContract.id;
          console.log(`   ✅ Contrat créé: id=${contractId}`);
        } else {
          console.log(`   → (dry-run) Serait créé: contrat pour offer_id=${offerId}`);
          contractId = '(nouveau-contract-dry-run)';
        }
      } else {
        contractId = contracts[0].id;
        console.log(`   → Contrat trouvé: id=${contractId} | ${contracts[0].client_name}`);
      }

      if (!DRY_RUN) {
        const updateFields = { contract_id: contractId, updated_at: new Date().toISOString() };
        if (!inv.offer_id && offerId) updateFields.offer_id = offerId;
        const { error } = await sb.from('invoices').update(updateFields).eq('id', inv.id);
        if (error) { console.log(`   ❌ Patch invoice: ${error.message}`); continue; }
        console.log(`   ✅ invoice mis à jour → offer_id=${offerId}, contract_id=${contractId}`);
      } else {
        console.log(`   → (dry-run) Serait patché: invoice.offer_id → ${offerId}, invoice.contract_id → ${contractId}`);
      }
    } else if (!contractId) {
      console.log(`   ℹ️  contract_id déjà null mais fix_contract_id=false pour ce dossier`);
      // Utiliser offer_id pour trouver le contrat quand même
      if (inv.offer_id) {
        const { data: contracts } = await sb.from('contracts').select('id').eq('company_id', COMPANY_ID).eq('offer_id', inv.offer_id);
        contractId = contracts?.[0]?.id || null;
        if (contractId) console.log(`   ℹ️  Contrat trouvé via offer_id: ${contractId}`);
      }
      if (!contractId) { console.log('   ❌ Contrat introuvable'); continue; }
    }

    // ── Étape 2 : vérifier contract_equipment ────────────────────────────
    const { data: existingCE } = await sb
      .from('contract_equipment')
      .select('id, purchase_price, quantity')
      .eq('contract_id', contractId);

    if (existingCE?.length) {
      const existingPA = existingCE.reduce((s, e) => s + (e.purchase_price || 0) * (e.quantity || 1), 0);
      console.log(`   ℹ️  contract_equipment déjà présent: ${existingCE.length} ligne(s), PA total=${existingPA}€`);
      totalPAAdded += existingPA;
      continue;
    }

    // Pas de contract_equipment → créer
    const margin = (inv.amount || 0) - t.purchase_price;
    console.log(`   → contract_equipment manquant → à créer: PA=${t.purchase_price}€, marge=${margin.toFixed(2)}€`);

    if (!DRY_RUN) {
      const { error } = await sb.from('contract_equipment').insert({
        contract_id:     contractId,
        title:           'Voir facture',
        quantity:        1,
        purchase_price:  t.purchase_price,
        margin:          margin,
        monthly_payment: 0,
      });
      if (error) { console.log(`   ❌ contract_equipment: ${error.message}`); continue; }
      console.log(`   ✅ contract_equipment créé: PA=${t.purchase_price}€`);
      totalPAAdded += t.purchase_price;
    } else {
      console.log(`   → (dry-run) Serait créé: contract_equipment PA=${t.purchase_price}€`);
      totalPAAdded += t.purchase_price;
    }
  }

  console.log('\n' + '═'.repeat(60));
  const expectedTotal = 185935.40 + totalPAAdded;
  console.log(`  PA ajouté (estimé)   : ${totalPAAdded.toFixed(2)}€`);
  console.log(`  PA leasing attendu   : ~${expectedTotal.toFixed(2)}€  (réf: 189,371.48€)`);
  if (DRY_RUN) console.log('  (dry-run — aucune modification)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
