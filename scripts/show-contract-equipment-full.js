// show-contract-equipment-full.js
// Affiche le détail complet (titre non tronqué) des équipements d'un contrat
// Usage: node scripts/show-contract-equipment-full.js <contract_id_or_number>

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/show-contract-equipment-full.js <contract_id_or_number>');
  process.exit(1);
}

// Chercher le contrat par ID (UUID) ou par numéro
let contracts, ce;

const isFullUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg);
const isPartialUUID = /^[0-9a-f]{6,}$/i.test(arg) && !arg.includes('-');

if (isFullUUID) {
  // UUID complet
  ({ data: contracts, error: ce } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date, leaser_name, offer_id')
    .eq('id', arg));
} else if (isPartialUUID) {
  // Début de UUID (ex: "81634296") — chercher tous les contrats et filtrer côté client
  const { data: allContracts, error: allErr } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date, leaser_name, offer_id')
    .eq('company_id', 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0');
  ce = allErr;
  contracts = allContracts?.filter(c => c.id.replace(/-/g, '').startsWith(arg.toLowerCase()));
} else {
  // Chercher par contract_number (texte, ex: "CON-xxx", "LOC-xxx", "180-xxx")
  ({ data: contracts, error: ce } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date, leaser_name, offer_id')
    .ilike('contract_number', `%${arg}%`));
}

if (ce || !contracts?.length) {
  console.error('❌ Contrat non trouvé:', ce?.message || 'aucun résultat');
  process.exit(1);
}

const contract = contracts[0];
const year = contract.contract_start_date ? new Date(contract.contract_start_date).getFullYear() : '?';

console.log('\n📋 CONTRAT:', contract.contract_number || contract.id.substring(0, 8));
console.log('   Client:', contract.client_name);
console.log('   Année:', year);
console.log('   Leaser:', contract.leaser_name || 'N/A');
console.log('   Offer:', contract.offer_id || 'N/A');

// Récupérer les équipements
const { data: equipment, error: ee } = await sb
  .from('contract_equipment')
  .select('id, title, quantity, purchase_price, margin, order_status')
  .eq('contract_id', contract.id);

if (ee) {
  console.error('❌ Erreur équipements:', ee.message);
  process.exit(1);
}

console.log(`\n   ${equipment?.length || 0} ligne(s) d'équipement :\n`);

let totalPA = 0;
for (const eq of (equipment || [])) {
  const pa = parseFloat(eq.purchase_price) || 0;
  const qty = parseInt(eq.quantity) || 1;
  const totalLine = pa * qty;
  totalPA += totalLine;

  // Détecter si c'est groupé (SN: avec / ou segments évidents)
  const segments = eq.title.split(' / ').length;
  const hasSN = eq.title.includes('SN:');
  const isGrouped = (hasSN && segments > 1) || segments > 3;
  const flag = isGrouped ? ' ⚠️  GROUPÉ' : '';

  console.log(`  [${eq.id.substring(0, 8)}] qty=${qty} | PA=${pa.toFixed(2)}€ | total=${totalLine.toFixed(2)}€${flag}`);
  console.log(`   Status: ${eq.order_status || 'N/A'}`);
  console.log(`   Titre complet:`);
  // Afficher le titre en segments si séparés par " / "
  const parts = eq.title.split(' / ');
  if (parts.length > 1 && (hasSN || parts.length > 3)) {
    parts.forEach((p, i) => console.log(`     [${i+1}] ${p.trim()}`));
  } else {
    console.log(`     ${eq.title}`);
  }
  console.log('');
}

console.log(`   TOTAL PA: ${totalPA.toFixed(2)}€`);
console.log('');
