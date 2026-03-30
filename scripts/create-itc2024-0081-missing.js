/**
 * create-itc2024-0081-missing.js
 *
 * Crée la facture manquante ITC-2024-0081
 * Antoine Sottiaux - LeGrow Studio #2
 * Dossier 180-23893, Grenke, août 2024, 1 756,87 €
 *
 * Usage :
 *   node scripts/create-itc2024-0081-missing.js          → dry-run
 *   node scripts/create-itc2024-0081-missing.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const INVOICE_NUMBER  = 'ITC-2024-0081';
const INVOICE_DATE    = '2024-08-01';
const AMOUNT          = 1756.87;
const PURCHASE_AMOUNT = 1099.00;
const DOSSIER         = '180-23893';
const CLIENT_NAME     = 'Antoine Sottiaux';
const COMPANY_NAME    = 'LeGrow Studio #2';

async function main() {
  console.log(`\n🔧 CRÉATION ${INVOICE_NUMBER} — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  console.log(`  Client  : ${CLIENT_NAME} / ${COMPANY_NAME}`);
  console.log(`  Dossier : ${DOSSIER}`);
  console.log(`  Date    : ${INVOICE_DATE}`);
  console.log(`  Montant : ${AMOUNT} €`);
  console.log(`  PA      : ${PURCHASE_AMOUNT} €`);
  console.log(`  Marge   : ${(AMOUNT - PURCHASE_AMOUNT).toFixed(2)} € (${(((AMOUNT - PURCHASE_AMOUNT) / AMOUNT) * 100).toFixed(2)} %)\n`);

  // 1. Vérifier que la facture n'existe pas déjà
  const { data: existing } = await sb
    .from('invoices')
    .select('id, invoice_number')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', INVOICE_NUMBER)
    .maybeSingle();

  if (existing) {
    console.log(`  ⚠️  ${INVOICE_NUMBER} existe déjà (id: ${existing.id}) — rien à faire.\n`);
    return;
  }
  console.log(`  ✅ ${INVOICE_NUMBER} n'existe pas encore → à créer\n`);

  // 2. Chercher le contrat pour ce dossier (180-23893)
  const { data: contracts } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, dossier_number')
    .eq('company_id', COMPANY_ID)
    .or(`dossier_number.eq.${DOSSIER},client_name.ilike.%Antoine Sottiaux%,client_name.ilike.%LeGrow%`);

  console.log(`  Contrats trouvés pour dossier ${DOSSIER} / Antoine Sottiaux :\n`);
  contracts?.forEach(c => {
    console.log(`    ${c.id} | ${c.contract_number || '?'} | ${c.client_name} | dossier: ${c.dossier_number || '?'}`);
  });

  // 3. Chercher l'offer pour ce dossier
  const { data: offers } = await sb
    .from('offers')
    .select('id, dossier_number, client_name, status')
    .eq('company_id', COMPANY_ID)
    .or(`dossier_number.eq.${DOSSIER},client_name.ilike.%Antoine Sottiaux%,client_name.ilike.%LeGrow%`);

  console.log(`\n  Offers trouvés :\n`);
  offers?.forEach(o => {
    console.log(`    ${o.id} | dossier: ${o.dossier_number || '?'} | ${o.client_name} | status: ${o.status}`);
  });

  // Sélectionner le bon offer (dossier 180-23893)
  const offer    = offers?.find(o => o.dossier_number === DOSSIER) || offers?.[0] || null;

  // Chercher le contrat lié à cet offer
  let contract = contracts?.[0] || null;
  if (!contract && offer) {
    const { data: contractsByOffer } = await sb
      .from('contracts')
      .select('id, contract_number, client_name')
      .eq('company_id', COMPANY_ID)
      .eq('offer_id', offer.id);
    contract = contractsByOffer?.[0] || null;
    if (contract) console.log(`  ✅ Contrat trouvé via offer_id : ${contract.id} | ${contract.client_name}`);
  }

  console.log(`\n  → Contrat sélectionné : ${contract?.id || 'aucun'} (${contract?.client_name || '?'})`);
  console.log(`  → Offer sélectionné   : ${offer?.id || 'aucun'} (dossier: ${offer?.dossier_number || '?'})`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour créer la facture\n');
    return;
  }

  // 4. Créer la facture
  const billingData = {
    contract_data: {
      client_name:    CLIENT_NAME,
      client_company: COMPANY_NAME,
      dossier_number: DOSSIER,
    },
    purchase_amount: PURCHASE_AMOUNT,
    margin:          AMOUNT - PURCHASE_AMOUNT,
  };

  const invoicePayload = {
    company_id:       COMPANY_ID,
    invoice_number:   INVOICE_NUMBER,
    invoice_date:     INVOICE_DATE,
    invoice_type:     'leasing',
    integration_type: 'manual',
    status:           'paid',
    amount:           AMOUNT,
    leaser_name:      '1. Grenke Lease',
    contract_id:      contract?.id || null,
    offer_id:         offer?.id    || null,
    billing_data:     billingData,
    created_at:       INVOICE_DATE,
    updated_at:       new Date().toISOString(),
  };

  const { data: created, error } = await sb
    .from('invoices')
    .insert(invoicePayload)
    .select('id, invoice_number, amount')
    .single();

  if (error) {
    console.error(`\n  ❌ Erreur création facture : ${error.message}\n`);
    return;
  }
  console.log(`\n  ✅ Facture créée : ${created.invoice_number} | id: ${created.id} | ${created.amount} €`);

  // 5. Corriger le leaser du contrat si nécessaire (Atlance → Grenke)
  if (contract?.id) {
    // Chercher le leaser Grenke
    const { data: leasers } = await sb
      .from('leasers')
      .select('id, name')
      .eq('company_id', COMPANY_ID)
      .ilike('name', '%grenke%');

    const grenkeLeaser = leasers?.[0];
    if (grenkeLeaser) {
      const { error: lupErr } = await sb
        .from('contracts')
        .update({ leaser_id: grenkeLeaser.id, leaser_name: grenkeLeaser.name, updated_at: new Date().toISOString() })
        .eq('id', contract.id);
      if (lupErr) console.log(`  ⚠️  Leaser non corrigé : ${lupErr.message}`);
      else console.log(`  ✅ Leaser corrigé sur contrat : ${grenkeLeaser.name}`);
    } else {
      console.log(`  ⚠️  Leaser Grenke non trouvé dans la DB`);
    }
  }
  console.log('');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
