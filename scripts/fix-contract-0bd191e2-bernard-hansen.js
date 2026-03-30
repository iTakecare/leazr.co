/**
 * fix-contract-0bd191e2-bernard-hansen.js
 *
 * Contrat: 0bd191e2 - Bernard Hansen (2024, Grenke)
 * Action : Supprime la ligne groupée [78e5b9c7] et crée 3 lignes séparées.
 *
 * PA DB  : 1384.00€
 * PA SS  : 1384.63€ (diff 0.63€ arrondi)
 * Note   : Apple Watch 41mm → qty=2 (2 montres au même prix unitaire)
 *
 * Usage:
 *   node scripts/fix-contract-0bd191e2-bernard-hansen.js          # dry-run
 *   node scripts/fix-contract-0bd191e2-bernard-hansen.js --apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');
const CONTRACT_ID_PREFIX = '0bd191e2';
const GROUPED_ID_PREFIX  = '78e5b9c7';

const NEW_EQUIPMENT = [
  { title: 'iPhone 13 128 Go - RFB GR A | SN: 350407031055083', quantity: 1, purchase_price: 544.63 },
  { title: 'Apple Watch Serie 8 - 41mm | SN: C2919Y3P6G',       quantity: 2, purchase_price: 280.00 },
  { title: 'Apple Watch Serie 8 - 45mm | SN: JVHNXG9VT2',       quantity: 1, purchase_price: 280.00 },
];

const totalNew = NEW_EQUIPMENT.reduce((s, e) => s + e.purchase_price * e.quantity, 0);

const { data: allContracts } = await sb
  .from('contracts').select('id, contract_number, client_name')
  .eq('company_id', 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0');

const contract = allContracts?.find(c => c.id.replace(/-/g, '').startsWith(CONTRACT_ID_PREFIX));
if (!contract) { console.error('❌ Contrat non trouvé'); process.exit(1); }

const { data: equipment } = await sb
  .from('contract_equipment').select('id, title, quantity, purchase_price, order_status')
  .eq('contract_id', contract.id);

const grouped = equipment?.find(e => e.id.replace(/-/g, '').startsWith(GROUPED_ID_PREFIX));
if (!grouped) { console.error('❌ Ligne groupée non trouvée'); process.exit(1); }

console.log('\n🔧 FIX - Bernard Hansen (0bd191e2)');
console.log('   Mode:', APPLY ? '🚀 APPLY' : '🔍 DRY-RUN');
console.log('   Client:', contract.client_name);

console.log('\n❌ Ligne à SUPPRIMER :');
console.log(`   [${grouped.id.substring(0,8)}] qty=${grouped.quantity} | PA=${grouped.purchase_price}€`);

console.log('\n✅ 3 lignes à CRÉER :');
for (const e of NEW_EQUIPMENT) {
  const t = (e.purchase_price * e.quantity).toFixed(2);
  console.log(`   qty=${e.quantity} | PA=${e.purchase_price}€ | total=${t}€ | ${e.title}`);
}
console.log(`\n   Total nouveau PA : ${totalNew.toFixed(2)}€`);
console.log(`   Total ancien PA  : ${grouped.purchase_price}€`);

if (!APPLY) {
  console.log('\n⚠️  Dry-run — relancer avec --apply.\n');
  process.exit(0);
}

const { error: delErr } = await sb.from('contract_equipment').delete().eq('id', grouped.id);
if (delErr) { console.error('❌ Erreur suppression:', delErr.message); process.exit(1); }
console.log('\n✅ Ligne groupée supprimée');

const { data: inserted, error: insErr } = await sb.from('contract_equipment')
  .insert(NEW_EQUIPMENT.map(e => ({
    contract_id: contract.id,
    title: e.title,
    quantity: e.quantity,
    purchase_price: e.purchase_price,
    margin: 0,
    order_status: grouped.order_status || 'received',
  }))).select('id, title, quantity, purchase_price');

if (insErr) { console.error('❌ Erreur insertion:', insErr.message); process.exit(1); }

console.log(`✅ ${inserted.length} lignes créées :`);
for (const i of inserted) {
  console.log(`   [${i.id.substring(0,8)}] qty=${i.quantity} | PA=${i.purchase_price}€ | ${i.title}`);
}
console.log('\n✅ Done.\n');
