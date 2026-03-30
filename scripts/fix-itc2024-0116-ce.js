/**
 * fix-itc2024-0116-ce.js
 *
 * Corrige les contract_equipment du contrat bff5666a (Mamy Home / ITC-2024-0116)
 * qui a 2 lignes CE au lieu d'une.
 *
 * Usage :
 *   node scripts/fix-itc2024-0116-ce.js          → diagnostic
 *   node scripts/fix-itc2024-0116-ce.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const APPLY       = process.argv.includes('--apply');
const sb          = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const CONTRACT_ID = 'bff5666a-9f47-4f91-86db-9b49eafeab99';

const SERIAL_NUMBERS = [
  '356298581853603', '356298581847977', '356298581812476',
  '356298581848926', '356298581849601', '356298581849767',
  '356298581812518', '356298581854205', '356298581849833',
  '356298581849965'
];
const EQUIPMENT_TITLE = 'Galaxy Xcover 7 Enterprise Edition 256Go';

async function main() {
  console.log(`\n🔧 FIX CE — ITC-2024-0116 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const { data: rows, error } = await sb
    .from('contract_equipment')
    .select('id, title, purchase_price, quantity, serial_number')
    .eq('contract_id', CONTRACT_ID);

  if (error) { console.log('❌', error.message); return; }

  console.log(`  ${rows.length} ligne(s) contract_equipment :`);
  for (const r of rows) {
    console.log(`  → id=${r.id}`);
    console.log(`     title   : ${r.title}`);
    console.log(`     qty     : ${r.quantity}`);
    console.log(`     PA      : ${r.purchase_price}`);
    console.log(`     serial  : ${JSON.stringify(r.serial_number)}`);
  }

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour enrichir le(s) titre(s)\n');
    return;
  }

  // Stratégie : distribuer les 10 SN sur les lignes existantes
  // proportionnellement à leur quantité (ou uniformément si qty manquant)
  let snOffset = 0;
  for (const r of rows) {
    const qty   = r.quantity || 1;
    const sns   = SERIAL_NUMBERS.slice(snOffset, snOffset + qty);
    snOffset   += qty;

    const newTitle = `${EQUIPMENT_TITLE} | SN: ${sns.join(', ')}`;
    const { error: upErr } = await sb
      .from('contract_equipment')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', r.id);

    if (upErr) {
      console.log(`  ❌ ${r.id}: ${upErr.message}`);
    } else {
      console.log(`  ✅ ${r.id} → title="${newTitle}"`);
    }
  }

  console.log('\n  ✅ Terminé.\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
