/**
 * fix-contract-81634296-xavier-gorskis.js
 *
 * Contrat: 81634296 - Xavier Gorskis (2024, Grenke)
 * Action : Supprime la ligne groupée [45210a1f] et crée 6 lignes séparées
 *          avec les PA corrects du spreadsheet iTakecare.
 *
 * PA groupé actuel (DB) : 6018.50€  ← incorrect
 * PA total spreadsheet  : 5530.26€  ← correct
 *
 * Usage:
 *   node scripts/fix-contract-81634296-xavier-gorskis.js          # dry-run
 *   node scripts/fix-contract-81634296-xavier-gorskis.js --apply  # apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');
const CONTRACT_ID_PREFIX = '81634296';
const GROUPED_EQUIPMENT_ID_PREFIX = '45210a1f';

// Équipements séparés (source: spreadsheet iTakecare "Achat marchandise / Offre Full Pack")
const NEW_EQUIPMENT = [
  {
    title: 'Thinkpad E16 i5/16Go/512 - NEW | SN: SPF4TGCL9',
    quantity: 1,
    purchase_price: 787.50,
  },
  {
    title: 'LENOVO ThinkBook 16 Gen6 | SN: PW0A8TXX',
    quantity: 1,
    purchase_price: 815.00,
  },
  {
    title: 'Thinkpad V15 i5/16Go/512Go - OpenBox | SN: PF4HYQA5',
    quantity: 1,
    purchase_price: 559.00,
  },
  {
    title: 'Lenovo ThinkCentre neo 50q Mini PC i5-13420H/8Go | SN: SYJ01MWQQ',
    quantity: 4,
    purchase_price: 339.16,
  },
  {
    title: 'Ecran Samsung 24" incurvé',
    quantity: 3,
    purchase_price: 81.96,
  },
  {
    title: 'iPad 8e gen A12 32GB Wifi RFB GR A | SN: DMQDLH4DQ1GC',
    quantity: 8,
    purchase_price: 220.78,
  },
];

const totalNew = NEW_EQUIPMENT.reduce((s, e) => s + e.purchase_price * e.quantity, 0);

// --- Trouver le contrat ---
const { data: allContracts } = await sb
  .from('contracts')
  .select('id, contract_number, client_name')
  .eq('company_id', 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0');

const contract = allContracts?.find(c => c.id.replace(/-/g, '').startsWith(CONTRACT_ID_PREFIX.toLowerCase()));
if (!contract) {
  console.error('❌ Contrat non trouvé (prefix:', CONTRACT_ID_PREFIX, ')');
  process.exit(1);
}

// --- Trouver la ligne groupée ---
const { data: equipment } = await sb
  .from('contract_equipment')
  .select('id, title, quantity, purchase_price, order_status')
  .eq('contract_id', contract.id);

const grouped = equipment?.find(e => e.id.replace(/-/g, '').startsWith(GROUPED_EQUIPMENT_ID_PREFIX.toLowerCase()));
if (!grouped) {
  console.error('❌ Ligne groupée non trouvée (prefix:', GROUPED_EQUIPMENT_ID_PREFIX, ')');
  process.exit(1);
}

// --- Affichage ---
console.log('\n🔧 FIX - Contrat Xavier Gorskis (81634296)');
console.log('   Mode:', APPLY ? '🚀 APPLY' : '🔍 DRY-RUN');
console.log('   Contrat:', contract.id);
console.log('   Client:', contract.client_name);

console.log('\n❌ Ligne à SUPPRIMER :');
console.log(`   [${grouped.id.substring(0,8)}] qty=${grouped.quantity} | PA=${grouped.purchase_price}€`);
console.log(`   Titre: ${grouped.title.substring(0, 100)}...`);

console.log('\n✅ Lignes à CRÉER :');
let totalCheck = 0;
for (const e of NEW_EQUIPMENT) {
  const lineTotal = e.purchase_price * e.quantity;
  totalCheck += lineTotal;
  console.log(`   qty=${e.quantity} | PA=${e.purchase_price}€ | total=${lineTotal.toFixed(2)}€ | ${e.title}`);
}
console.log(`\n   Total nouveau PA : ${totalCheck.toFixed(2)}€`);
console.log(`   Total ancien PA  : ${grouped.purchase_price}€`);
console.log(`   Différence       : ${(totalCheck - parseFloat(grouped.purchase_price)).toFixed(2)}€`);

if (!APPLY) {
  console.log('\n⚠️  Dry-run — rien n\'a été modifié.');
  console.log('   Relancer avec --apply pour appliquer.\n');
  process.exit(0);
}

// --- Suppression ---
const { error: delErr } = await sb
  .from('contract_equipment')
  .delete()
  .eq('id', grouped.id);

if (delErr) {
  console.error('❌ Erreur suppression:', delErr.message);
  process.exit(1);
}
console.log('\n✅ Ligne groupée supprimée');

// --- Insertion ---
const toInsert = NEW_EQUIPMENT.map(e => ({
  contract_id: contract.id,
  title: e.title,
  quantity: e.quantity,
  purchase_price: e.purchase_price,
  margin: 0,
  order_status: grouped.order_status || 'received',
}));

const { data: inserted, error: insErr } = await sb
  .from('contract_equipment')
  .insert(toInsert)
  .select('id, title, quantity, purchase_price');

if (insErr) {
  console.error('❌ Erreur insertion:', insErr.message);
  process.exit(1);
}

console.log(`✅ ${inserted.length} lignes créées :`);
for (const i of inserted) {
  console.log(`   [${i.id.substring(0,8)}] qty=${i.quantity} | PA=${i.purchase_price}€ | ${i.title.substring(0,60)}`);
}
console.log('\n✅ Done.\n');
