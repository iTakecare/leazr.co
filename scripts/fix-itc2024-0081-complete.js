/**
 * fix-itc2024-0081-complete.js
 *
 * Répare ITC-2024-0081 — Antoine Sottiaux / LeGrow Studio
 * Dossier : 180-23893
 *
 * Étapes :
 *  1. Diagnostic complet (offre, contrat, invoice, contract_equipment)
 *  2. Crée le contrat si manquant
 *  3. Lie invoice.contract_id au contrat (sans toucher offer_id si contrainte)
 *  4. Crée contract_equipment PA=1099 si manquant
 *  5. Corrige billing_data client
 *
 * Usage :
 *   node scripts/fix-itc2024-0081-complete.js           → diagnostic
 *   node scripts/fix-itc2024-0081-complete.js --apply   → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const DOSSIER      = '180-23893';
const INV_NUMBER   = 'ITC-2024-0081';
const INV_DATE     = '2024-08-01';
const FA           = 1756.87;
const PA           = 1099.00;
const CLIENT_NAME  = 'Antoine Sottiaux';
const CLIENT_CO    = 'LeGrow Studio';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔍 DIAGNOSTIC ITC-2024-0081 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Facture ──────────────────────────────────────────────────────────
  const { data: inv, error: ie } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', INV_NUMBER)
    .single();

  if (ie || !inv) { console.error('❌ Facture introuvable:', ie?.message); return; }

  console.log('── Facture ──');
  console.log(`  id           : ${inv.id}`);
  console.log(`  date         : ${inv.invoice_date}`);
  console.log(`  offer_id     : ${inv.offer_id    || '(null)'}`);
  console.log(`  contract_id  : ${inv.contract_id || '(null)'}`);
  console.log(`  client_name  : ${inv.billing_data?.contract_data?.client_name || inv.billing_data?.client_name || '?'}`);

  // ── 2. Offre via dossier_number ─────────────────────────────────────────
  const { data: offers } = await sb
    .from('offers')
    .select('id, dossier_number, client_id, client_name, user_id')
    .eq('company_id', COMPANY_ID)
    .ilike('dossier_number', `%${DOSSIER}%`);

  console.log(`\n── Offres dossier ${DOSSIER} ──`);
  if (!offers?.length) { console.log('  ❌ Aucune offre trouvée'); }
  for (const o of (offers || [])) {
    console.log(`  id=${o.id} | dossier="${o.dossier_number}" | client="${o.client_name}" | user_id=${o.user_id}`);
  }

  const offer = offers?.[0];
  if (!offer) { console.log('\n❌ Impossible de continuer sans offre.'); return; }

  // Vérifier si cet offer a déjà une autre facture (contrainte unique)
  const { data: existingInvForOffer } = await sb
    .from('invoices')
    .select('id, invoice_number')
    .eq('offer_id', offer.id)
    .neq('id', inv.id);

  const offerAlreadyUsed = existingInvForOffer?.length > 0;
  if (offerAlreadyUsed) {
    console.log(`\n  ⚠️  L'offre ${offer.id} est déjà liée à : ${existingInvForOffer.map(i=>i.invoice_number).join(', ')}`);
    console.log(`      → On ne mettra PAS offer_id sur la facture (contrainte unique idx_invoices_unique_offer)`);
    console.log(`      → On mettra UNIQUEMENT contract_id`);
  }

  // ── 3. Contrat existant pour cette offre ────────────────────────────────
  const { data: contracts } = await sb
    .from('contracts')
    .select('id, offer_id, user_id, created_at')
    .eq('offer_id', offer.id);

  console.log(`\n── Contrats pour l'offre ──`);
  if (!contracts?.length) {
    console.log('  (aucun contrat)');
  } else {
    for (const c of contracts) {
      console.log(`  id=${c.id} | user_id=${c.user_id} | créé=${c.created_at}`);
    }
  }

  let contractId = contracts?.[0]?.id || null;

  // ── 4. Contrat déjà lié à la facture ───────────────────────────────────
  if (inv.contract_id) {
    const { data: linkedContract } = await sb
      .from('contracts')
      .select('id, offer_id')
      .eq('id', inv.contract_id)
      .single();
    console.log(`\n── Contrat lié à la facture ──`);
    if (linkedContract) {
      console.log(`  id=${linkedContract.id} | offer_id=${linkedContract.offer_id}`);
      contractId = linkedContract.id; // Priorité au contrat déjà lié
    } else {
      console.log(`  ⚠️  contract_id=${inv.contract_id} introuvable en DB`);
    }
  }

  // ── 5. Contract_equipment ───────────────────────────────────────────────
  let ceRows = [];
  if (contractId) {
    const { data: ce } = await sb
      .from('contract_equipment')
      .select('id, title, purchase_price, quantity, monthly_payment')
      .eq('contract_id', contractId);
    ceRows = ce || [];
    console.log(`\n── Contract_equipment (contract ${contractId}) ──`);
    if (!ceRows.length) {
      console.log('  (aucun)');
    } else {
      for (const r of ceRows) {
        console.log(`  id=${r.id} | "${r.title}" | PA=${r.purchase_price} x ${r.quantity} | MP=${r.monthly_payment}`);
      }
    }
  }

  const paTotal = ceRows.reduce((s, r) => s + (r.purchase_price || 0) * (r.quantity || 1), 0);
  console.log(`  PA total actuel : ${paTotal} (attendu: ${PA})`);

  // ── Résumé des actions à effectuer ─────────────────────────────────────
  console.log('\n══ ACTIONS NÉCESSAIRES ══════════════════════════════════════════\n');

  const actions = [];

  if (!contractId) {
    actions.push({ type: 'create_contract', label: `Créer un contrat pour offer ${offer.id}` });
  }

  if (!inv.contract_id || inv.contract_id !== contractId) {
    actions.push({ type: 'link_contract', label: `Lier invoice.contract_id = ${contractId || '(nouveau)'}` });
  }

  if (!offerAlreadyUsed && !inv.offer_id) {
    actions.push({ type: 'link_offer', label: `Lier invoice.offer_id = ${offer.id}` });
  }

  if (paTotal !== PA) {
    actions.push({ type: 'fix_ce', label: `Recréer contract_equipment PA=${PA}` });
  }

  const currentClientName = inv.billing_data?.contract_data?.client_name || '';
  if (currentClientName !== CLIENT_NAME) {
    actions.push({ type: 'fix_billing', label: `Corriger billing_data: "${currentClientName}" → "${CLIENT_NAME}" (${CLIENT_CO})` });
  }

  if (!actions.length) {
    console.log('  ✅ Tout est déjà correct, rien à faire.\n');
    return;
  }

  for (const a of actions) console.log(`  🔧 ${a.label}`);
  console.log();

  if (!APPLY) {
    console.log('  → Relance avec --apply pour appliquer\n');
    return;
  }

  // ── APPLICATION ─────────────────────────────────────────────────────────
  console.log('🔧 APPLICATION...\n');

  // a) Créer contrat si besoin
  if (actions.find(a => a.type === 'create_contract')) {
    // Récupérer user_id
    let userId = offer.user_id;
    if (!userId) {
      const { data: profile } = await sb.from('profiles').select('id').eq('email', 'hello@itakecare.be').single();
      userId = profile?.id;
    }
    const { data: newContract, error: ce } = await sb
      .from('contracts')
      .insert({ offer_id: offer.id, company_id: COMPANY_ID, user_id: userId })
      .select('id')
      .single();
    if (ce) { console.log('  ❌ Création contrat:', ce.message); return; }
    contractId = newContract.id;
    console.log(`  ✅ Contrat créé : ${contractId}`);
  }

  // b) Lier offer_id si possible
  if (actions.find(a => a.type === 'link_offer')) {
    const { error } = await sb
      .from('invoices')
      .update({ offer_id: offer.id, updated_at: new Date().toISOString() })
      .eq('id', inv.id);
    if (error) console.log(`  ❌ offer_id: ${error.message}`);
    else console.log(`  ✅ invoice.offer_id = ${offer.id}`);
  }

  // c) Lier contract_id
  if (actions.find(a => a.type === 'link_contract')) {
    const { error } = await sb
      .from('invoices')
      .update({ contract_id: contractId, updated_at: new Date().toISOString() })
      .eq('id', inv.id);
    if (error) console.log(`  ❌ contract_id: ${error.message}`);
    else console.log(`  ✅ invoice.contract_id = ${contractId}`);
  }

  // d) Recréer contract_equipment
  if (actions.find(a => a.type === 'fix_ce')) {
    // Supprimer l'existant
    if (ceRows.length) {
      await sb.from('contract_equipment').delete().eq('contract_id', contractId);
      console.log(`  🗑  Ancien contract_equipment supprimé`);
    }
    const { error } = await sb.from('contract_equipment').insert({
      contract_id:     contractId,
      title:           'Équipement LeGrow Studio',
      quantity:        1,
      purchase_price:  PA,
      margin:          FA - PA,
      monthly_payment: FA,
    });
    if (error) console.log(`  ❌ contract_equipment: ${error.message}`);
    else console.log(`  ✅ contract_equipment créé : PA=${PA}`);
  }

  // e) Corriger billing_data
  if (actions.find(a => a.type === 'fix_billing')) {
    const newBilling = {
      ...(inv.billing_data || {}),
      contract_data: {
        ...(inv.billing_data?.contract_data || {}),
        client_name:    CLIENT_NAME,
        client_company: CLIENT_CO,
      },
      client_name:    CLIENT_NAME,
      client_company: CLIENT_CO,
    };
    const { error } = await sb
      .from('invoices')
      .update({ billing_data: newBilling, updated_at: new Date().toISOString() })
      .eq('id', inv.id);
    if (error) console.log(`  ❌ billing_data: ${error.message}`);
    else console.log(`  ✅ billing_data: client_name = "${CLIENT_NAME}" (${CLIENT_CO})`);
  }

  console.log('\n  ✅ Terminé.\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
