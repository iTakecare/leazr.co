/**
 * fix-contract-4de776d2-salvatore-arrigo.js
 *
 * Contrat: 4de776d2 - Salvatore Arrigo (2024, Grenke)
 * Action : Supprime la ligne groupée [1f048ccd] et crée 6 lignes séparées.
 *
 * PA total DB  : 9230.88€ ✅ (correspond au spreadsheet)
 *
 * Usage:
 *   node scripts/fix-contract-4de776d2-salvatore-arrigo.js          # dry-run
 *   node scripts/fix-contract-4de776d2-salvatore-arrigo.js --apply  # apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');
const CONTRACT_ID_PREFIX = '4de776d2';
const GROUPED_EQUIPMENT_ID_PREFIX = '1f048ccd';

const NEW_EQUIPMENT = [
  { title: 'MBP16 M1 Pro / 16Go / 1To SSD / AZERTY RFB GR A', quantity: 2, purchase_price: 1725.00 },
  { title: 'MBP16 M2 Max / 64Go / 2To SSD / AZERTY RFB GR A', quantity: 1, purchase_price: 3000.00 },
  { title: 'iPhone 14 Pro Max 128 Go - RFB GR A',              quantity: 3, purchase_price: 813.00  },
  { title: 'iPhone 14 Pro Max Protection',                      quantity: 4, purchase_price: 22.27   },
  { title: 'AirPods 3 - new',                                   quantity: 1, purchase_price: 149.00  },
  { title: 'Hub USB-C',                                         quantity: 3, purchase_price: 34.60   },
];

const totalNew = NEW_EQUIPMENT.reduce((s, e) => s + e.purchase_price * e.quantity, 0);

// Trouver le contrat
const { data: allContracts } = await sb
  .from('contracts')
  .select('id, contract_number, client_name')
  .eq('company_id', 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0');

const contract = allContracts?.find(c => c.id.replace(/-/g, '').startsWith(CONTRACT_ID_PREFIX));
if (!contract) { console.error('❌ Contrat non trouvé'); process.exit(1); }

// Trouver la ligne groupée
const { data: equipment } = await sb
  .from('contract_equipment')
  .select('id, title, quantity, purchase_price, order_status')
  .eq('contract_id', contract.id);

const grouped = equipment?.find(e => e.id.replace(/-/g, '').startsWith(GROUPED_EQUIPMENT_ID_PREFIX));
if (!grouped) { console.error('❌ Ligne groupée non trouvée'); process.exit(1); }

console.log('\n🔧 FIX - Contrat Salvatore Arrigo (4de776d2)');
console.log('   Mode:', APPLY ? '🚀 APPLY' : '🔍 DRY-RUN');
console.log('   Client:', contract.client_name);

console.log('\n❌ Ligne à SUPPRIMER :');
console.log(`   [${grouped.id.substring(0,8)}] qty=${grouped.quantity} | PA=${grouped.purchase_price}€`);

console.log('\n✅ Lignes à CRÉER :');
for (const e of NEW_EQUIPMENT) {
  const t = (e.purchase_price * e.quantity).toFixed(2);
  console.log(`   qty=${e.quantity} | PA=${e.purchase_price}€ | total=${t}€ | ${e.title}`);
}
console.log(`\n   Total nouveau PA : ${totalNew.toFixed(2)}€`);
console.log(`   Total ancien PA  : ${grouped.purchase_price}€`);

if (!APPLY) {
  console.log('\n⚠️  Dry-run — rien n\'a été modifié. Relancer avec --apply.\n');
  process.exit(0);
}

// Suppression
const { error: delErr } = await sb.from('contract_equipment').delete().eq('id', grouped.id);
if (delErr) { console.error('❌ Erreur suppression:', delErr.message); process.exit(1); }
console.log('\n✅ Ligne groupée supprimée');

// Insertion
const toInsert = NEW_EQUIPMENT.map(e => ({
  contract_id: contract.id,
  title: e.title,
  quantity: e.quantity,
  purchase_price: e.purchase_price,
  margin: 0,
  order_status: grouped.order_status || 'received',
}));

const { data: inserted, error: insErr } = await sb.from('contract_equipment').insert(toInsert).select('id, title, quantity, purchase_price');
if (insErr) { console.error('❌ Erreur insertion:', insErr.message); process.exit(1); }

console.log(`✅ ${inserted.length} lignes créées :`);
for (const i of inserted) {
  console.log(`   [${i.id.substring(0,8)}] qty=${i.quantity} | PA=${i.purchase_price}€ | ${i.title}`);
}
console.log('\n✅ Done.\n');
