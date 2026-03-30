/**
 * check-and-create-robinson.mjs
 * 1. Vérifie si le client Michelle Robinson existe déjà
 * 2. Affiche les contrats Gorskis pour valider les montants
 * 3. Si --create : crée le client et le contrat pour 180-7201
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const CREATE = process.argv.includes('--create');

// ── 1. Vérifier Robinson ───────────────────────────────────────────────────
console.log('\n🔍 Recherche Michelle Robinson...');
const { data: robinsonClients } = await sb
  .from('clients')
  .select('id, company, first_name, last_name, vat_number, address, city, zip')
  .eq('company_id', COMPANY_ID)
  .or('first_name.ilike.%michelle%,last_name.ilike.%robinson%,company.ilike.%dressage%');

if (robinsonClients?.length) {
  console.log('✅ Clients trouvés :', robinsonClients);
} else {
  console.log('❌ Aucun client Robinson/Mad for Dressage trouvé');
}

// ── 2. Vérifier Gorskis dans la DB ────────────────────────────────────────
console.log('\n🔍 Contrats Gorskis dans la DB...');
const { data: gorskisContracts } = await sb
  .from('contracts')
  .select('id, client_name, contract_number, status, offer_id')
  .eq('company_id', COMPANY_ID)
  .ilike('client_name', '%gorskis%')
  .neq('status', 'cancelled');

for (const c of gorskisContracts || []) {
  // Charger financed_amount
  const { data: offer } = c.offer_id
    ? await sb.from('offers').select('financed_amount').eq('id', c.offer_id).single()
    : { data: null };
  console.log(`  ${c.id} | ${c.client_name} | contract_number=${c.contract_number} | FA=${offer?.financed_amount} | status=${c.status}`);
}

// ── 3. Créer Robinson si --create ─────────────────────────────────────────
if (!CREATE) {
  console.log('\n⚠️  DRY RUN — relance avec --create pour créer le client Robinson');
  process.exit(0);
}

console.log('\n🚀 Création du client Michelle Robinson...');

const { data: newClient, error: clientErr } = await sb
  .from('clients')
  .insert({
    company_id: COMPANY_ID,
    first_name: 'Michelle',
    last_name: 'Robinson',
    company: 'Mad for Dressage',
    vat_number: 'BE0764738003',
    address: 'Rue St Marcoult(Silly) 56',
    city: 'Silly',
    zip: '7830',
    country: 'BE',
  })
  .select()
  .single();

if (clientErr) {
  console.error('❌ Erreur création client:', clientErr.message);
  process.exit(1);
}
console.log('✅ Client créé :', newClient.id, newClient.first_name, newClient.last_name);

// Créer le contrat Grenke 180-7201
const { data: newContract, error: contractErr } = await sb
  .from('contracts')
  .insert({
    company_id: COMPANY_ID,
    client_id: newClient.id,
    client_name: 'Michelle Robinson',
    leaser_name: 'Grenke',
    contract_number: '180-7201',
    status: 'active',
    monthly_payment: null,  // à compléter si connu
  })
  .select()
  .single();

if (contractErr) {
  console.error('❌ Erreur création contrat:', contractErr.message);
  process.exit(1);
}
console.log('✅ Contrat créé :', newContract.id, '— Grenke 180-7201');
