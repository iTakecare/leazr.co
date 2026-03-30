/**
 * diagnose-january-sql.js
 *
 * Diagnostique pourquoi le dashboard affiche 32 013,48€ pour janvier
 * alors que la DB a les bonnes données (36 257,84€).
 *
 * Vérifie :
 *  1. Le contrat bc0475ea lié à ITC-2023-005 (Dav Constructance)
 *  2. L'offre et le company_id au niveau contrat/offre
 *  3. Le résultat brut de la RPC get_monthly_financial_data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const CONTRACT_ID          = 'bc0475ea'; // contrat de ITC-2023-005 Dav Constructance

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('🔍 Diagnostic contrat ITC-2023-005 (Dav Constructance)');
  console.log('══════════════════════════════════════════════════════════\n');

  // 1. Fetch full contract
  const { data: contract, error: cErr } = await sb.from('contracts')
    .select('*')
    .ilike('id', `${CONTRACT_ID}%`)
    .maybeSingle();

  if (cErr || !contract) {
    console.log(`❌ Contrat ${CONTRACT_ID} introuvable : ${cErr?.message || 'null'}`);
  } else {
    console.log('📄 Contrat bc0475ea :');
    console.log(`   id         : ${contract.id}`);
    console.log(`   company_id : ${contract.company_id || 'NULL ⚠️'}`);
    console.log(`   offer_id   : ${contract.offer_id || 'NULL'}`);
    console.log(`   status     : ${contract.status || '?'}`);
    console.log(`   created_at : ${contract.created_at?.substring(0,10)}`);

    // 2. Fetch offer
    if (contract.offer_id) {
      const { data: offer } = await sb.from('offers')
        .select('id, dossier_number, company_id, status')
        .eq('id', contract.offer_id)
        .maybeSingle();
      if (offer) {
        console.log(`\n📋 Offre liée :`);
        console.log(`   id           : ${offer.id}`);
        console.log(`   dossier_number: ${offer.dossier_number}`);
        console.log(`   company_id   : ${offer.company_id || 'NULL ⚠️'}`);
        console.log(`   status       : ${offer.status}`);
      }
    }
  }

  // 3. CE détail pour bc0475ea
  console.log(`\n📦 contract_equipment pour bc0475ea :`);
  const { data: ce } = await sb.from('contract_equipment')
    .select('id, title, quantity, purchase_price, actual_purchase_price')
    .ilike('contract_id', `${CONTRACT_ID}%`);

  let ceTotal = 0;
  for (const e of ce || []) {
    const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
    ceTotal += pp * (e.quantity || 1);
    console.log(`   ${(e.title||'?').substring(0,45).padEnd(45)} qty=${e.quantity} pp=${e.purchase_price} actual_pp=${e.actual_purchase_price ?? '—'}`);
  }
  console.log(`   → Total CE : ${ceTotal.toFixed(2)}€`);

  // 4. Appel RPC get_monthly_financial_data
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log('📊 Résultat RPC get_monthly_financial_data (2023)');
  console.log('══════════════════════════════════════════════════════════\n');

  // Try common signatures
  const signatures = [
    { p_company_id: COMPANY_ID, p_year: 2023 },
    { company_id: COMPANY_ID, year: 2023 },
    { p_company_id: COMPANY_ID, p_year: 2023, p_currency: 'EUR' },
  ];

  let rpcData = null;
  for (const params of signatures) {
    const { data, error } = await sb.rpc('get_monthly_financial_data', params);
    if (!error && data) { rpcData = data; break; }
    if (error) console.log(`  [tentative ${JSON.stringify(params)}] → ${error.message}`);
  }

  if (rpcData) {
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    for (const row of rpcData) {
      const m = (row.month || row.mois || row.month_number) - 1;
      const rev = row.revenue ?? row.ca ?? row.total_revenue ?? 0;
      const pur = row.purchases ?? row.achats ?? row.total_purchases ?? 0;
      const marge = rev - pur;
      const mn = months[m] || `M${m+1}`;
      console.log(`  ${mn}: CA=${parseFloat(rev).toFixed(2).padStart(10)}€  Achats=${parseFloat(pur).toFixed(2).padStart(10)}€  Marge=${marge.toFixed(2).padStart(10)}€`);
    }
  } else {
    console.log('  ❌ RPC inaccessible ou signature inconnue');
    console.log('     → Essayons de lire la définition de la fonction...');

    // Try to get function definition from pg_proc via RPC
    const { data: fnDef } = await sb.rpc('get_function_definition', {
      function_name: 'get_monthly_financial_data'
    }).catch(() => ({ data: null }));
    if (fnDef) console.log(fnDef);
  }

  // 5. Vérifie si la function utilise contracts.company_id dans son calcul
  //    En comparant: invoice avec contract (ITC-2023-005) vs sans (billing_data)
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log('🔬 Test : contrats dans company_id vs contract.company_id');
  console.log('══════════════════════════════════════════════════════════\n');

  // Toutes les factures jan 2023 avec company_id
  const { data: janInvs } = await sb.from('invoices')
    .select('id, invoice_number, contract_id, company_id, amount')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-01-31');

  for (const inv of janInvs || []) {
    if (!inv.contract_id) continue;
    // Fetch contract company_id
    const { data: c } = await sb.from('contracts')
      .select('id, company_id')
      .eq('id', inv.contract_id)
      .maybeSingle();
    const contractCo = c?.company_id;
    const match = contractCo === COMPANY_ID ? '✅' : contractCo ? '❌ DIFFÉRENT' : '⚠️  NULL';
    console.log(`  ${(inv.invoice_number||'?').padEnd(20)} → contract.company_id: ${contractCo?.substring(0,8)||'NULL'} ${match}`);
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
