/**
 * fix-commandes-fournisseurs.js
 *
 * Passe en "received" tous les contract_equipment "to_order" / "ordered"
 * des contrats ≤ 2024, SAUF :
 *   - Les contrats ARSG / AR Saint Ghislain (chromebooks)
 *   - Le contrat V-Infra 2025 (Surface Hub)
 *
 * Usage :
 *   node scripts/fix-commandes-fournisseurs.js          → dry-run
 *   node scripts/fix-commandes-fournisseurs.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Patterns de noms/numéros de contrats à NE PAS toucher
const KEEP_CONTRACT_PATTERNS = [
  /ar\s*saint[\s-]ghislain/i,
  /arsg/i,
  /v[\s-]?infra/i,
];

// Patterns de titres d'équipements à NE PAS toucher
// (peu importe le contrat : si un équipement matche, tout le contrat est protégé)
const KEEP_TITLE_PATTERNS = [
  /chromebook/i,
  /surface\s*hub/i,
];

// Contract IDs hardcodés à protéger (identifiés manuellement)
const KEEP_CONTRACT_IDS = [
  'e430d986', // Nicolas Ceron — ARSG Chromebooks
];

function shouldKeepPending(c) {
  const name = (c.client_name || '').toLowerCase();
  const num  = (c.contract_number || '').toLowerCase();
  return KEEP_CONTRACT_PATTERNS.some(p => p.test(name) || p.test(num));
}

function titleShouldKeep(title) {
  return KEEP_TITLE_PATTERNS.some(p => p.test(title || ''));
}

async function main() {
  console.log(`\n🔧 FIX COMMANDES FOURNISSEURS — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // 1. Tous les contrats de la company
  const { data: contracts, error: cErr } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date, created_at')
    .eq('company_id', COMPANY_ID);
  if (cErr) { console.error('❌ contracts:', cErr.message); return; }

  const contractMap = {};
  contracts.forEach(c => { contractMap[c.id] = c; });
  const contractIds = contracts.map(c => c.id);

  // 2. Tous les contract_equipment "à commander" pour ces contrats
  const BATCH = 200;
  let allItems = [];
  for (let i = 0; i < contractIds.length; i += BATCH) {
    const batch = contractIds.slice(i, i + BATCH);
    const { data, error } = await sb
      .from('contract_equipment')
      .select('id, order_status, quantity, title, contract_id')
      .in('contract_id', batch)
      .in('order_status', ['to_order', 'ordered']);
    if (error) { console.error('❌ contract_equipment:', error.message); return; }
    if (data) allItems = allItems.concat(data);
  }

  console.log(`  ${allItems.length} équipements "à commander" / "commandé" trouvés\n`);
  if (!allItems.length) { console.log('  Rien à faire.\n'); return; }

  // 3. Triage
  const toFix = [];
  const toKeep = [];

  for (const item of allItems) {
    const c = contractMap[item.contract_id];
    if (!c) { toFix.push({ item, contract: null }); continue; }

    const startY = parseInt(c.contract_start_date?.slice(0,4) || '9999');
    const creatY = parseInt(c.created_at?.slice(0,4) || '9999');
    const year   = Math.min(startY, creatY);

    const contractIdShort = (item.contract_id || '').slice(0, 8);
    const isProtectedId    = KEEP_CONTRACT_IDS.some(id => item.contract_id?.startsWith(id));
    const isProtectedTitle = titleShouldKeep(item.title);
    const isProtectedName  = shouldKeepPending(c);

    if (year > 2024) {
      toKeep.push({ item, contract: c, reason: `année ${year} > 2024` });
    } else if (isProtectedId) {
      toKeep.push({ item, contract: c, reason: `contract ID protégé (${contractIdShort})` });
    } else if (isProtectedTitle) {
      toKeep.push({ item, contract: c, reason: `titre protégé: ${item.title?.slice(0,40)}` });
    } else if (isProtectedName) {
      toKeep.push({ item, contract: c, reason: 'ARSG/V-Infra → garder en attente' });
    } else {
      toFix.push({ item, contract: c });
    }
  }

  console.log(`  ✅ À corriger → "received" : ${toFix.length}`);
  console.log(`  ⏭️  À conserver tel quel    : ${toKeep.length}\n`);

  if (toFix.length) {
    console.log('═══ CORRECTIONS PRÉVUES ═══\n');
    for (const { item, contract } of toFix) {
      const c = contract || { contract_number: item.contract_id?.slice(0,8), client_name: '?' };
      console.log(`  🔄 ${(c.contract_number||'?').padEnd(22)} ${(c.client_name||'?').padEnd(35)} | ${item.order_status} → received | ${item.title||'?'}`);
    }
  }

  if (toKeep.length) {
    console.log('\n═══ CONSERVÉS (inchangés) ═══\n');
    for (const { item, contract, reason } of toKeep) {
      const c = contract || { contract_number: '?', client_name: '?' };
      console.log(`  ⏭️  ${(c.contract_number||'?').padEnd(22)} ${(c.client_name||'?').padEnd(35)} | ${item.order_status} [${reason}] | ${item.title||'?'}`);
    }
  }

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
    return;
  }

  // 4. Mise à jour
  const ids = toFix.map(f => f.item.id).filter(Boolean);
  if (!ids.length) { console.log('\n  Rien à mettre à jour.\n'); return; }

  let nDone = 0, nErr = 0;
  // Par batch de 50
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { error: upErr } = await sb
      .from('contract_equipment')
      .update({ order_status: 'received' })
      .in('id', batch);
    if (upErr) { console.log(`  ❌ batch ${i}: ${upErr.message}`); nErr += batch.length; }
    else nDone += batch.length;
  }
  console.log(`\n  ✅ ${nDone} équipements mis à jour en "received" (${nErr} erreurs)\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
