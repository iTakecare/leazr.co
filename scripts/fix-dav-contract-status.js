/**
 * fix-dav-contract-status.js
 *
 * ROOT CAUSE : La SQL function get_monthly_financial_data filtre les achats avec :
 *   AND c.status IN ('signed', 'active', 'delivered', 'completed', 'equipment_ordered')
 *
 * Le contrat de Dav Constructance (ITC-2023-005 / 180-17880) est encore au statut
 * "analyse_leaser" ou similaire → ses achats = 0€ dans le dashboard.
 *
 * FIX : Mettre c.status = 'signed' pour le contrat bc0475ea
 *
 * Usage :
 *   node scripts/fix-dav-contract-status.js --dry-run
 *   node scripts/fix-dav-contract-status.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Statuts acceptés par la SQL function pour compter les achats
const VALID_STATUSES = ['signed', 'active', 'delivered', 'completed', 'equipment_ordered'];

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN\n');

  // 1. Trouver l'invoice ITC-2023-005
  const { data: inv } = await sb.from('invoices')
    .select('id, invoice_number, contract_id, company_id')
    .eq('invoice_number', 'ITC-2023-005')
    .maybeSingle();

  if (!inv?.contract_id) {
    console.log('❌ Invoice ITC-2023-005 ou contract_id introuvable');
    process.exit(1);
  }

  console.log(`✅ Invoice: ${inv.invoice_number} → contract_id: ${inv.contract_id}`);

  // 2. Lire le statut actuel du contrat
  const { data: contract, error } = await sb.from('contracts')
    .select('id, status, company_id, offer_id')
    .eq('id', inv.contract_id)
    .maybeSingle();

  if (error || !contract) {
    console.log(`❌ Contrat ${inv.contract_id} introuvable : ${error?.message}`);
    process.exit(1);
  }

  console.log(`\n📄 Contrat actuel :`);
  console.log(`   id         : ${contract.id}`);
  console.log(`   status     : ${contract.status} ${VALID_STATUSES.includes(contract.status) ? '✅ (déjà valide!)' : '⚠️  NON COMPTÉ dans le dashboard'}`);
  console.log(`   company_id : ${contract.company_id || 'NULL ⚠️'}`);
  console.log(`   offer_id   : ${contract.offer_id || 'NULL'}`);

  // 3. Vérifier aussi l'offre
  if (contract.offer_id) {
    const { data: offer } = await sb.from('offers')
      .select('id, dossier_number, company_id, status')
      .eq('id', contract.offer_id)
      .maybeSingle();
    if (offer) {
      console.log(`\n📋 Offre liée :`);
      console.log(`   dossier_number: ${offer.dossier_number}`);
      console.log(`   status        : ${offer.status}`);
      console.log(`   company_id    : ${offer.company_id || 'NULL ⚠️'}`);
    }
  }

  // 4. Vérifier CE
  const { data: ce } = await sb.from('contract_equipment')
    .select('id, title, quantity, purchase_price, actual_purchase_price')
    .eq('contract_id', inv.contract_id);
  const ceTotal = (ce||[]).reduce((s,e)=>(e.actual_purchase_price??e.purchase_price??0)*(e.quantity||1)+s, 0);
  console.log(`\n📦 contract_equipment : ${ce?.length || 0} lignes, total = ${ceTotal.toFixed(2)}€`);
  for (const e of ce||[]) {
    console.log(`   ${(e.title||'?').substring(0,45).padEnd(45)} actual_pp=${e.actual_purchase_price ?? e.purchase_price}`);
  }

  if (VALID_STATUSES.includes(contract.status)) {
    console.log(`\n✅ Statut déjà valide (${contract.status}). Problème ailleurs.`);
    console.log('   Vérifie la company_id du contrat et de l\'offre ci-dessus.');
    return;
  }

  // 5. Appliquer le fix
  console.log(`\n🔧 FIX : ${contract.status} → signed`);

  const updates = {
    status: 'signed',
    updated_at: new Date().toISOString(),
  };
  // Si company_id manquant sur le contrat, le définir
  if (!contract.company_id) {
    updates.company_id = COMPANY_ID;
    console.log(`   + company_id défini sur le contrat`);
  }

  if (!DRY_RUN) {
    const { error: updErr } = await sb.from('contracts')
      .update(updates)
      .eq('id', inv.contract_id);

    if (updErr) {
      console.log(`❌ Erreur update contrat : ${updErr.message}`);
      process.exit(1);
    }
    console.log(`✅ Contrat mis à jour → status = 'signed'`);

    // Vérification rapide via RPC
    console.log('\n📊 Vérification RPC janvier 2023 :');
    const { data: rpc } = await sb.rpc('get_monthly_financial_data', { p_year: 2023 });
    const jan = rpc?.find(r => r.month_number === 1);
    if (jan) {
      const pur = parseFloat(jan.purchases || 0);
      const rev = parseFloat(jan.revenue || 0);
      const diff = Math.round((pur - 36257.84) * 100) / 100;
      console.log(`   Janvier: CA=${rev.toFixed(2)}€  Achats=${pur.toFixed(2)}€  Marge=${(rev-pur).toFixed(2)}€`);
      console.log(`   Écart vs cible (36 257,84€) : ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}€ ${Math.abs(diff) < 1 ? '✅' : '⚠️'}`);
    }
  } else {
    console.log(`[DRY] Mettrait contracts.status = 'signed' pour ${inv.contract_id}`);
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
