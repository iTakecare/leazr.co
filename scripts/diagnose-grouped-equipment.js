/**
 * diagnose-grouped-equipment.js
 *
 * Cherche les contract_equipment dont le titre contient "/" ou "/"
 * (signe que plusieurs équipements ont été regroupés en une seule ligne).
 *
 * Usage :
 *   node scripts/diagnose-grouped-equipment.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC ÉQUIPEMENTS GROUPÉS\n');

  // Tous les contrats
  const { data: contracts } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date')
    .eq('company_id', COMPANY_ID);
  const contractMap = {};
  contracts?.forEach(c => { contractMap[c.id] = c; });
  const contractIds = contracts?.map(c => c.id) || [];

  // Tous les contract_equipment
  const BATCH = 200;
  let allItems = [];
  for (let i = 0; i < contractIds.length; i += BATCH) {
    const batch = contractIds.slice(i, i + BATCH);
    const { data, error } = await sb
      .from('contract_equipment')
      .select('id, title, quantity, purchase_price, order_status, contract_id')
      .in('contract_id', batch);
    if (error) { console.error('❌', error.message); return; }
    if (data) allItems = allItems.concat(data);
  }

  console.log(`  ${allItems.length} lignes contract_equipment analysées\n`);

  // Filtre : titre contenant " / " ou "SN:" multiples ou longueur > 80 chars avec /
  const grouped = allItems.filter(item => {
    const t = item.title || '';
    // Séparateur " / " ou " | " typique du regroupement, ou titre très long
    const hasSeparator = / \/ /.test(t) || / \| /.test(t);
    const hasMultipleSN = (t.match(/SN:/g) || []).length > 1;
    return hasSeparator || hasMultipleSN;
  });

  if (!grouped.length) {
    console.log('  ✅ Aucun équipement groupé détecté !\n');
    return;
  }

  console.log(`  ⚠️  ${grouped.length} lignes potentiellement groupées :\n`);

  // Groupe par contrat
  const byContract = {};
  for (const item of grouped) {
    if (!byContract[item.contract_id]) byContract[item.contract_id] = [];
    byContract[item.contract_id].push(item);
  }

  for (const [cid, items] of Object.entries(byContract)) {
    const c = contractMap[cid];
    const num = c?.contract_number || cid.slice(0,8);
    const name = c?.client_name || '?';
    const year = c?.contract_start_date?.slice(0,4) || '?';
    console.log(`  📦 ${num.padEnd(22)} | ${name.padEnd(35)} | ${year}`);
    for (const item of items) {
      // Compter les segments
      const segments = (item.title || '').split(/ \/ | \| /).length;
      console.log(`       [${item.id.slice(0,8)}] qty=${item.quantity} | ${segments} segments | ${(item.title||'').slice(0,80)}${(item.title||'').length > 80 ? '...' : ''}`);
    }
  }

  console.log(`\n  → ${Object.keys(byContract).length} contrat(s) concerné(s)`);
  console.log('  → Ces lignes devraient être séparées en lignes individuelles\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
