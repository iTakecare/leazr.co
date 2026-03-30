/**
 * fix-contract-1289406e-helene-rasquin.js
 *
 * Contrat: 1289406e - Helene Rasquin (2024, Grenke)
 * Action : Supprime la ligne groupée [bbf5f159] et crée 13 lignes séparées.
 *
 * PA DB  : 7141.20€
 * PA SS  : 7141.42€ (diff 0.22€ arrondi — on utilise les prix du spreadsheet)
 *
 * Usage:
 *   node scripts/fix-contract-1289406e-helene-rasquin.js          # dry-run
 *   node scripts/fix-contract-1289406e-helene-rasquin.js --apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');
const CONTRACT_ID_PREFIX = '1289406e';
const GROUPED_ID_PREFIX  = 'bbf5f159';

const NEW_EQUIPMENT = [
  { title: 'Apple iMac 24 M1 16Go 1To SSD RFB GR A | SN: C02FV036Q6X9',  quantity: 3, purchase_price: 1300.00 },
  { title: 'Magic Keyboard FR avec numpad',                                 quantity: 1, purchase_price: 111.00  },
  { title: 'iPad Pro 11 M1 128Go Wifi + 5G | SN: 356635356870272',         quantity: 1, purchase_price: 650.00  },
  { title: 'iPad Pro 12.9" M1 2To WiFi | SN: D5C9C59KYW',                  quantity: 1, purchase_price: 900.00  },
  { title: 'iPhone 13 128 Go RED',                                          quantity: 1, purchase_price: 483.00  },
  { title: 'Logitech Combo Touch iPad Pro 11',                              quantity: 1, purchase_price: 150.00  },
  { title: 'Logitech Combo Touch iPad Pro 12.9',                           quantity: 1, purchase_price: 210.00  },
  { title: 'Apple Pencil 2',                                                quantity: 1, purchase_price: 99.17   },
  { title: 'Adaptateur USB-C',                                              quantity: 3, purchase_price: 30.07   },
  { title: 'Chargeur 20W + Cable USB',                                      quantity: 1, purchase_price: 12.99   },
  { title: 'Huawei P20',                                                    quantity: 1, purchase_price: 189.37  },
  { title: 'Ecran Huawei P20 - LCD phone',                                  quantity: 1, purchase_price: 45.68   },
  { title: 'Mac mini',                                                       quantity: 1, purchase_price: 300.00  },
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

console.log('\n🔧 FIX - Helene Rasquin (1289406e)');
console.log('   Mode:', APPLY ? '🚀 APPLY' : '🔍 DRY-RUN');
console.log('   Client:', contract.client_name);

console.log('\n❌ Ligne à SUPPRIMER :');
console.log(`   [${grouped.id.substring(0,8)}] qty=${grouped.quantity} | PA=${grouped.purchase_price}€`);

console.log('\n✅ 13 lignes à CRÉER :');
for (const e of NEW_EQUIPMENT) {
  const t = (e.purchase_price * e.quantity).toFixed(2);
  console.log(`   qty=${e.quantity} | PA=${e.purchase_price}€ | total=${t}€ | ${e.title}`);
}
console.log(`\n   Total nouveau PA : ${totalNew.toFixed(2)}€`);
console.log(`   Total ancien PA  : ${grouped.purchase_price}€`);
console.log(`   Différence       : ${(totalNew - parseFloat(grouped.purchase_price)).toFixed(2)}€ (arrondi)`);

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
