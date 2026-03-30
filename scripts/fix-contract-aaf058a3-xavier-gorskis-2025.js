/**
 * fix-contract-aaf058a3-xavier-gorskis-2025.js
 *
 * Contrat: aaf058a3 - Xavier Gorskis (2025, Grenke)
 * Action : Supprime la ligne groupée [5fd11b4b] et crée 7 lignes séparées.
 *
 * PA DB (incorrect) : 5150.01€  ← ne tenait pas compte des quantités
 * PA SS (correct)   : 5735.01€  ← 2× neo 50q @ 490€ + 2× écran @ 95€
 *
 * Usage:
 *   node scripts/fix-contract-aaf058a3-xavier-gorskis-2025.js          # dry-run
 *   node scripts/fix-contract-aaf058a3-xavier-gorskis-2025.js --apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');
const CONTRACT_ID_PREFIX = 'aaf058a3';
const GROUPED_ID_PREFIX  = '5fd11b4b';

const NEW_EQUIPMENT = [
  { title: 'LENOVO ThinkBook 16 Gen6 i5/16/512 | SN: PW0B88MD',              quantity: 1, purchase_price: 619.01 },
  { title: 'Lenovo ThinkCentre neo 50q Mini PC i5-13420H/8Go (bibliothèque)', quantity: 2, purchase_price: 490.00 },
  { title: 'Serveur Apple Mac Pro - Active directory',                         quantity: 1, purchase_price: 1474.00 },
  { title: 'Ecran Samsung 24" incurvé',                                        quantity: 2, purchase_price: 95.00  },
  { title: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',                    quantity: 1, purchase_price: 1155.00 },
  { title: 'Brother DCP-L8410CDW color laser 31ppm',                           quantity: 1, purchase_price: 384.00 },
  { title: 'Epson EcoTank ET-16650',                                            quantity: 1, purchase_price: 933.00 },
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

console.log('\n🔧 FIX - Xavier Gorskis 2025 (aaf058a3)');
console.log('   Mode:', APPLY ? '🚀 APPLY' : '🔍 DRY-RUN');
console.log('   Client:', contract.client_name);

console.log('\n❌ Ligne à SUPPRIMER :');
console.log(`   [${grouped.id.substring(0,8)}] qty=${grouped.quantity} | PA=${grouped.purchase_price}€ (incorrect)`);

console.log('\n✅ 7 lignes à CRÉER :');
for (const e of NEW_EQUIPMENT) {
  const t = (e.purchase_price * e.quantity).toFixed(2);
  console.log(`   qty=${e.quantity} | PA=${e.purchase_price}€ | total=${t}€ | ${e.title}`);
}
console.log(`\n   Total nouveau PA : ${totalNew.toFixed(2)}€ (corrigé)`);
console.log(`   Total ancien PA  : ${grouped.purchase_price}€ (était incorrect)`);
console.log(`   Différence       : +${(totalNew - parseFloat(grouped.purchase_price)).toFixed(2)}€`);

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
