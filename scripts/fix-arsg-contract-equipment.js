/**
 * fix-arsg-contract-equipment.js
 *
 * Le contrat ARSG (e430d986) a son contract_equipment en une seule ligne groupée.
 * Ce script remplace cette ligne par 5 lignes séparées correspondant à l'offer_equipment.
 *
 * Équipements (tirés de la demande) :
 *   46x Acer Chromebook Plus 515 i3/8Go/128SSD/15,6"  PA=289€   PV=289€
 *   46x Souris Logitech USB                            PA=9.80€  PV=9.80€
 *   46x Hub USB-C vers USB-A                           PA=10.74€ PV=10.74€
 *    1x Good Connections Armoire ANTARES N30E          PA=1150€  PV=1150€
 *    2x Imprimantes Epson ET-2850                      PA=190.08€ PV=190.08€
 *
 * Usage :
 *   node scripts/fix-arsg-contract-equipment.js          → dry-run
 *   node scripts/fix-arsg-contract-equipment.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY       = process.argv.includes('--apply');
const CONTRACT_ID = 'e430d986-c0ae-4d39-9947-01929ec83f4f'; // CON-e430d986 — ARSG

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Équipements séparés (tirés de l'offer/demande ARSG)
const EQUIPMENT_LINES = [
  { title: 'Acer Chromebook Plus 515 i3 / 8Go / 128SSD /15,6"', quantity: 46, purchase_price: 289.00,  margin: 0 },
  { title: 'Souris Logitech USB',                                quantity: 46, purchase_price: 9.80,    margin: 0 },
  { title: 'Hub USB-C vers USB-A',                               quantity: 46, purchase_price: 10.74,   margin: 0 },
  { title: 'Good Connections Armoire pour PC ANTARES N30E',      quantity: 1,  purchase_price: 1150.00, margin: 0 },
  { title: 'Imprimantes Epson ET-2850',                          quantity: 2,  purchase_price: 190.08,  margin: 0 },
];

async function main() {
  console.log(`\n🔧 FIX ARSG CONTRACT EQUIPMENT — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // 1. Contrat existant
  const { data: contract } = await sb
    .from('contracts')
    .select('id, contract_number, client_name')
    .eq('id', CONTRACT_ID)
    .maybeSingle();

  if (!contract) {
    console.log(`  ❌ Contrat ${CONTRACT_ID} introuvable\n`);
    return;
  }
  console.log(`  Contrat : ${contract.contract_number || CONTRACT_ID.slice(0,8)} | ${contract.client_name}\n`);

  // 2. contract_equipment existant
  const { data: existing } = await sb
    .from('contract_equipment')
    .select('id, title, quantity, purchase_price, order_status')
    .eq('contract_id', CONTRACT_ID);

  console.log(`  contract_equipment existant (${existing?.length || 0} ligne(s)) :`);
  existing?.forEach(e => console.log(`    [${e.id.slice(0,8)}] qty=${e.quantity} | PA=${e.purchase_price}€ | ${e.order_status} | ${(e.title||'').slice(0,60)}`));

  // 3. Nouvelles lignes
  console.log(`\n  Nouvelles lignes à créer (${EQUIPMENT_LINES.length}) :`);
  let totalPA = 0;
  EQUIPMENT_LINES.forEach(e => {
    const pa = e.purchase_price * e.quantity;
    totalPA += pa;
    console.log(`    qty=${e.quantity} | PA unit=${e.purchase_price}€ | PA total=${pa.toFixed(2)}€ | ${e.title}`);
  });
  console.log(`    → PA TOTAL : ${totalPA.toFixed(2)} €`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
    return;
  }

  // 4. Supprimer les lignes existantes
  const existingIds = (existing || []).map(e => e.id);
  if (existingIds.length > 0) {
    const { error: delErr } = await sb
      .from('contract_equipment')
      .delete()
      .in('id', existingIds);
    if (delErr) { console.error(`  ❌ Suppression: ${delErr.message}\n`); return; }
    console.log(`\n  🗑️  ${existingIds.length} ligne(s) supprimée(s)`);
  }

  // 5. Insérer les nouvelles lignes
  const newRows = EQUIPMENT_LINES.map(e => ({
    contract_id:    CONTRACT_ID,
    title:          e.title,
    quantity:       e.quantity,
    purchase_price: e.purchase_price,
    margin:         e.margin,
    order_status:   'to_order', // ARSG reste à commander
  }));

  const { data: inserted, error: insErr } = await sb
    .from('contract_equipment')
    .insert(newRows)
    .select('id, title, quantity');

  if (insErr) { console.error(`  ❌ Insertion: ${insErr.message}\n`); return; }
  console.log(`  ✅ ${inserted?.length || 0} nouvelles lignes créées\n`);
  inserted?.forEach(r => console.log(`    ${r.id.slice(0,8)} | qty=${r.quantity} | ${r.title}`));
  console.log('');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
