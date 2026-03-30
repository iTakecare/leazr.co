/**
 * fix-contract-0a5a1d03-thibaud-de-clerck.js
 *
 * Contrat: 0a5a1d03 - Thibaud de Clerck (2025, Grenke)
 * Action : Supprime la ligne groupée [dadec123] et crée 5 lignes séparées.
 * PA total : 3358.16€ ✅
 *
 * Usage:
 *   node scripts/fix-contract-0a5a1d03-thibaud-de-clerck.js          # dry-run
 *   node scripts/fix-contract-0a5a1d03-thibaud-de-clerck.js --apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');
const CONTRACT_ID_PREFIX = '0a5a1d03';
const GROUPED_ID_PREFIX  = 'dadec123';

const NEW_EQUIPMENT = [
  { title: 'Microsoft Surface X + Pen + Cover/Kbd - RFB GR A | SN: 20066703253', quantity: 1, purchase_price: 829.27  },
  { title: 'Apple Watch 10 46mm - RFB GR A | SN: GCR3466KQR',                   quantity: 1, purchase_price: 366.33  },
  { title: 'iPhone 15 Pro Max 1To - NEW | SN: 352192204099070',                  quantity: 1, purchase_price: 1392.91 },
  { title: 'iPad Pro 11 M1 256 Go Wifi + 5G - RFB GR A | SN: T1QXPRHWLD',       quantity: 1, purchase_price: 657.15  },
  { title: 'Apple Pencil 2',                                                      quantity: 1, purchase_price: 112.50  },
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

console.log('\n🔧 FIX - Thibaud de Clerck (0a5a1d03)');
console.log('   Mode:', APPLY ? '🚀 APPLY' : '🔍 DRY-RUN');
console.log('   Client:', contract.client_name);

console.log('\n❌ Ligne à SUPPRIMER :');
console.log(`   [${grouped.id.substring(0,8)}] qty=${grouped.quantity} | PA=${grouped.purchase_price}€`);

console.log('\n✅ Lignes à CRÉER :');
for (const e of NEW_EQUIPMENT) {
  console.log(`   qty=${e.quantity} | PA=${e.purchase_price}€ | ${e.title}`);
}
console.log(`\n   Total PA : ${totalNew.toFixed(2)}€ ✅`);

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
  console.log(`   [${i.id.substring(0,8)}] qty=${i.quantity} | PA=${i.purchase_price}€ | ${i.title.substring(0,60)}`);
}
console.log('\n✅ Done.\n');
