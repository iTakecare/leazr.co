import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes('--apply');

const CONTRACT_ID   = '6b43506a-885a-4622-a66a-5985c8706f80'; // Naci-Prosper 180-17104
const GROUPED_ID    = '377a4f69-4a8a-4897-ba01-e9dc7b4715cd'; // iPad Pro / Trepied / Pencil

const NEW_EQUIPMENT = [
  { title: 'iPad Pro 2020 12,9 Pouces, Wi-Fi + Cellular, 1 To (4e Gen)',  quantity: 1, purchase_price: 1300 },
  { title: 'Trépied iPad',                                                  quantity: 1, purchase_price: 65   },
  { title: 'Apple Pencil compatible',                                       quantity: 1, purchase_price: 50   },
];

const total = NEW_EQUIPMENT.reduce((s, e) => s + e.purchase_price * e.quantity, 0);
console.log(`\n📋 Contrat Naci-Prosper Ndayishimiye — 180-17104`);
console.log(`🗑  Suppression ligne groupée : "iPad Pro 2020 12,9 Pouces / Trepied / Pencil compatible" (1415€)`);
console.log(`\n✅ Nouvelles lignes (total PA = ${total}€) :`);
NEW_EQUIPMENT.forEach(e => console.log(`   ${e.quantity}x ${e.title} — ${e.purchase_price}€`));

if (!APPLY) {
  console.log('\n⚠️  DRY RUN — relance avec --apply pour appliquer');
  process.exit(0);
}

// Supprimer la ligne groupée
const { error: delErr } = await sb.from('contract_equipment').delete().eq('id', GROUPED_ID);
if (delErr) { console.error('Erreur suppression:', delErr); process.exit(1); }

// Insérer les nouvelles lignes
const rows = NEW_EQUIPMENT.map(e => ({
  contract_id:    CONTRACT_ID,
  title:          e.title,
  quantity:       e.quantity,
  purchase_price: e.purchase_price,
  margin:         0,
  order_status:   'received',
}));

const { error: insErr } = await sb.from('contract_equipment').insert(rows);
if (insErr) { console.error('Erreur insertion:', insErr); process.exit(1); }

console.log('\n✅ Correction appliquée avec succès !');
