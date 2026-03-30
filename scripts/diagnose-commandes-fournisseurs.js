/**
 * diagnose-commandes-fournisseurs.js
 *
 * Analyse les contract_equipment avec order_status = 'to_order' ou 'ordered'
 * pour les contrats 2024 (et avant), pour identifier ceux qui sont
 * incorrectement marqués "À commander".
 *
 * Usage :
 *   node scripts/diagnose-commandes-fournisseurs.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC COMMANDES FOURNISSEURS\n');

  // 1. Tous les contrats de la company
  const { data: contracts, error: cErr } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date, created_at, status, is_self_leasing')
    .eq('company_id', COMPANY_ID);
  if (cErr) { console.error('❌ contracts:', cErr.message); return; }

  const contractMap = {};
  contracts.forEach(c => { contractMap[c.id] = c; });
  const contractIds = contracts.map(c => c.id);
  console.log(`  ${contractIds.length} contrats chargés\n`);

  // 2. Tous les contract_equipment "à commander" pour ces contrats
  const BATCH = 200;
  let allItems = [];
  for (let i = 0; i < contractIds.length; i += BATCH) {
    const batch = contractIds.slice(i, i + BATCH);
    const { data, error } = await sb
      .from('contract_equipment')
      .select('id, order_status, quantity, purchase_price, title, contract_id')
      .in('contract_id', batch)
      .in('order_status', ['to_order', 'ordered']);
    if (error) { console.error('❌ contract_equipment:', error.message); return; }
    if (data) allItems = allItems.concat(data);
  }

  console.log(`  ${allItems.length} équipements avec statut "à commander" / "commandé"\n`);
  if (!allItems.length) return;

  // 3. Groupe par contrat
  const byContract = {};
  for (const item of allItems) {
    const cid = item.contract_id;
    if (!byContract[cid]) byContract[cid] = [];
    byContract[cid].push(item);
  }

  console.log('═══ DÉTAIL PAR CONTRAT ═══\n');
  for (const [cid, equips] of Object.entries(byContract)) {
    const c = contractMap[cid] || { contract_number: cid.slice(0,8), client_name: '?', contract_start_date: '?' };
    console.log(`  📦 ${(c.contract_number || '?').padEnd(22)} | ${(c.client_name || '?').padEnd(35)} | start=${c.contract_start_date || '?'} | status=${c.status}`);
    for (const eq of equips) {
      console.log(`       ${(eq.order_status||'?').padEnd(10)} | qty=${eq.quantity} | PA=${eq.purchase_price}€ | ${eq.title || '?'}`);
    }
  }

  // 4. Résumé par année
  console.log('\n═══ RÉSUMÉ PAR ANNÉE (contrats avec équip. en attente) ═══\n');
  const byYear = {};
  for (const [cid, equips] of Object.entries(byContract)) {
    const c = contractMap[cid];
    const startY = parseInt(c?.contract_start_date?.slice(0,4) || '9999');
    const creatY = parseInt(c?.created_at?.slice(0,4) || '9999');
    const year = String(Math.min(startY, creatY));
    if (!byYear[year]) byYear[year] = { contracts: 0, items: 0 };
    byYear[year].contracts++;
    byYear[year].items += equips.length;
  }
  Object.entries(byYear).sort().forEach(([y, v]) => {
    console.log(`  ${y} : ${v.contracts} contrat(s), ${v.items} équipement(s)`);
  });

  // 5. Contrats ≤ 2024 à potentiellement corriger
  console.log('\n═══ CONTRATS ≤2024 À VÉRIFIER ═══\n');
  let toFix = 0;
  for (const [cid, equips] of Object.entries(byContract)) {
    const c = contractMap[cid];
    const startY = parseInt(c?.contract_start_date?.slice(0,4) || '9999');
    const creatY = parseInt(c?.created_at?.slice(0,4) || '9999');
    const year = Math.min(startY, creatY);
    if (year <= 2024) {
      const num = c?.contract_number || cid.slice(0,8);
      const name = c?.client_name || '?';
      console.log(`  ❌ ${num.padEnd(22)} ${name.padEnd(35)} (année ${year})`);
      equips.forEach(eq => {
        console.log(`       ${(eq.order_status||'?').padEnd(10)} | ${eq.title || '?'}`);
      });
      toFix += equips.length;
    }
  }
  console.log(`\n  → ${toFix} équipements ≤2024 potentiellement à corriger en "received"\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
