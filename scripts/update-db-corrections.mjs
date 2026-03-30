/**
 * update-db-corrections.mjs
 *
 * Applique les corrections identifiées depuis le fichier grenke-unmatched.xlsx :
 *  1. Correction des client_name dans contracts
 *  2. Correction des company dans clients
 *  3. Annulation de 3 contrats (remarques utilisateur)
 *  4. Mise à jour des statuts DB selon statut Grenke (DefectiveContract→defaulted, etc.)
 *
 * Usage : node scripts/update-db-corrections.mjs           (dry-run)
 *         node scripts/update-db-corrections.mjs --apply   (applique)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const GRENKE = JSON.parse(readFileSync(join(__dir, 'grenke-data.json'), 'utf8'));

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const APPLY = process.argv.includes('--apply');

// ── 1. Charger tous les contrats Grenke actifs ────────────────────────────
const { data: contracts } = await sb
  .from('contracts')
  .select('id, client_id, client_name, contract_number, status, offer_id, contract_start_date')
  .eq('company_id', COMPANY_ID)
  .ilike('leaser_name', '%grenke%')
  .neq('status', 'cancelled');

const { data: offers } = await sb
  .from('offers').select('id, financed_amount')
  .in('id', contracts.map(c => c.offer_id).filter(Boolean));
const offerMap = new Map((offers||[]).map(o => [o.id, Number(o.financed_amount)]));

const clientIds = [...new Set(contracts.map(c => c.client_id).filter(Boolean))];
const { data: clients } = await sb
  .from('clients').select('id, company, first_name, last_name')
  .in('id', clientIds);
const clientMap = new Map((clients||[]).map(c => [c.id, c]));

// Helper: find contract by FA + start_date
function findContract(fa, startDate) {
  return contracts.filter(c => {
    const cfa = offerMap.get(c.offer_id);
    return Math.abs(cfa - fa) < 0.5 && c.contract_start_date === startDate;
  });
}

const contractPatches = []; // { id, patch }
const clientPatches   = []; // { id, patch }

// ── 2. Corrections client_name dans contracts ─────────────────────────────
const CLIENT_NAME_FIXES = [
  // Bastien Heynderickx — correction orthographe
  { fa: 2931.10, start: '2024-04-01', new_name: 'Bastien Heynderickx' },
  { fa: 2896.34, start: '2024-04-01', new_name: 'Bastien Heynderickx' },
  { fa: 6046.86, start: '2024-04-01', new_name: 'Bastien Heynderickx' },
  { fa: 4266.77, start: '2023-04-01', new_name: 'Bastien Heynderickx' },
  { fa: 3047.26, start: '2023-10-01', new_name: 'Bastien Heynderickx' },
  // Autres corrections
  { fa: 3382.62, start: '2025-01-01', new_name: 'Olivier Ranocha' },        // Be Grateful SRL
  { fa: 15255.52,start: '2023-04-01', new_name: 'Ersan Keles' },            // Cap Sud immobilier
  { fa: 2498.63, start: '2025-01-01', new_name: 'Davy Loomans' },           // Davy Loomans - JNS Lightning
  { fa: 1185.99, start: '2025-01-01', new_name: 'Gregory Ilnicki' },        // Gregory Ilnicki - Infra Route SRL
  { fa: 5891.80, start: '2023-01-01', new_name: 'Marine Georges' },         // Ardenne Belge Tourisme ASBL
  { fa: 7565.96, start: '2024-04-01', new_name: 'Thibaud de Clerck' },      // Alarmes De Clerck #2
  { fa: 2083.52, start: '2024-07-01', new_name: 'Thibaud de Clerck' },      // Alarmes De Clerck #3
  { fa: 1756.87, start: '2024-10-01', new_name: 'Thomas Reviers' },         // Xprove SCS #2
];

console.log('\n── 1. CORRECTIONS client_name ──────────────────────────────');
for (const fix of CLIENT_NAME_FIXES) {
  const hits = findContract(fix.fa, fix.start);
  if (!hits.length) { console.warn(`  ⚠️  Contrat non trouvé FA=${fix.fa} start=${fix.start}`); continue; }
  for (const c of hits) {
    if (c.client_name === fix.new_name) continue;
    console.log(`  ${c.id.substring(0,8)}… ${c.client_name} → ${fix.new_name}`);
    contractPatches.push({ id: c.id, patch: { client_name: fix.new_name } });
  }
}

// ── 3. Corrections company dans clients ──────────────────────────────────
// Map: fragment client_name (lower) + start_date → new company
const COMPANY_FIXES = [
  // Gorskis — toutes les entrées sans company
  { client_name_fragment: 'gorskis', new_company: 'Athénée Royal Saint Ghislain' },
  // Kevin Jadin — correction Trans-mission → KJ Consult
  { client_name_fragment: 'jadin', old_company: 'Trans-mission', new_company: 'KJ Consult' },
  // Divers
  { client_name_fragment: 'cleverson rodrigues', new_company: 'Cleverson Rodrigues' },
  { client_name_fragment: 'jean-francois verlinden', new_company: 'Solutions Mobilité' },
  { client_name_fragment: 'juan schmitz', new_company: 'Sales Rise' },
  { client_name_fragment: 'magali compere', new_company: 'Magali Compère' },
  { client_name_fragment: 'moises rodrigues', new_company: 'Moises Rodrigues' },
  { client_name_fragment: 'nicolas sols', new_company: 'Nicolas Sols' },
  { client_name_fragment: 'valérie crescence', new_company: 'Valérie Crescence' },
  { client_name_fragment: 'yentl adams', new_company: 'Yentl Adams' },
  { client_name_fragment: 'hubert halbrecq', new_company: 'TalentSquare SRL' },
  { client_name_fragment: 'thomas reviers', new_company: 'Xprove SCS' },
];

const seenClientIds = new Set();

console.log('\n── 2. CORRECTIONS company (clients table) ──────────────────');
for (const fix of COMPANY_FIXES) {
  for (const c of contracts) {
    if (!c.client_name.toLowerCase().includes(fix.client_name_fragment)) continue;
    const client = clientMap.get(c.client_id);
    if (!client || seenClientIds.has(client.id)) continue;
    if (fix.old_company && client.company !== fix.old_company) continue;
    if (client.company === fix.new_company) continue;
    console.log(`  client ${client.id.substring(0,8)}… "${client.company}" → "${fix.new_company}"`);
    clientPatches.push({ id: client.id, patch: { company: fix.new_company } });
    seenClientIds.add(client.id);
  }
}

// Ness Pelgrims — company vide
for (const c of contracts) {
  if (!c.client_name.toLowerCase().includes('pelgrims')) continue;
  const client = clientMap.get(c.client_id);
  if (!client || seenClientIds.has(client.id)) continue;
  if (client.company) continue;
  console.log(`  client ${client.id.substring(0,8)}… "" → "Ness Pelgrims"`);
  clientPatches.push({ id: client.id, patch: { company: 'Ness Pelgrims' } });
  seenClientIds.add(client.id);
}

// Bastien Heyderickx FA=6046 — ajouter Apik SRL
const bastienContract = findContract(6046.86, '2024-04-01')[0];
if (bastienContract) {
  const client = clientMap.get(bastienContract.client_id);
  if (client && !client.company && !seenClientIds.has(client.id)) {
    console.log(`  client ${client.id.substring(0,8)}… "" → "Apik SRL"`);
    clientPatches.push({ id: client.id, patch: { company: 'Apik SRL' } });
    seenClientIds.add(client.id);
  }
}

// ── 4. Annulation de 3 contrats ───────────────────────────────────────────
console.log('\n── 3. ANNULATIONS (remarques utilisateur) ──────────────────');
const CANCELLATIONS = [
  { fa: 1454.67, start: '2024-07-01', reason: 'Contrat terminé racheté et réinclus dans autre contrat' },
  { fa: 2740.79, start: '2026-04-01', reason: 'Contrat annulé (Baudouin)' },
  { fa: 735.13,  start: '2025-10-01', reason: 'Contrat annulé (Baudouin)' },
];
for (const c of CANCELLATIONS) {
  const hits = findContract(c.fa, c.start);
  if (!hits.length) { console.warn(`  ⚠️  Non trouvé FA=${c.fa} start=${c.start}`); continue; }
  for (const h of hits) {
    console.log(`  ${h.id.substring(0,8)}… ${h.client_name} FA=${c.fa} → cancelled (${c.reason})`);
    contractPatches.push({ id: h.id, patch: { status: 'cancelled' } });
  }
}

// ── 5. Mise à jour statuts Grenke → DB ───────────────────────────────────
console.log('\n── 4. STATUTS GRENKE → DB ──────────────────────────────────');
const grenkeMap = new Map(GRENKE.map(g => [g.grenke_contract_no, g]));
let statusUpdates = 0;
for (const c of contracts) {
  if (!c.contract_number) continue;
  const g = grenkeMap.get(c.contract_number);
  if (!g) continue;
  const targetStatus = g.leazr_status;
  if (targetStatus === c.status) continue;
  // Don't overwrite manual cancellations or equipment_ordered with active
  if (c.status === 'cancelled') continue;
  console.log(`  ${c.id.substring(0,8)}… ${c.client_name} | contract=${c.contract_number} | ${c.status} → ${targetStatus} (Grenke: ${g.grenke_status})`);
  contractPatches.push({ id: c.id, patch: { status: targetStatus } });
  statusUpdates++;
}
console.log(`  Total status updates: ${statusUpdates}`);

// ── 6. Appliquer ─────────────────────────────────────────────────────────
console.log(`\n══ RÉSUMÉ ══════════════════════════════════════════════════`);
console.log(`  Patches contracts : ${contractPatches.length}`);
console.log(`  Patches clients   : ${clientPatches.length}`);

if (!APPLY) {
  console.log('\n⚠️  DRY RUN — relance avec --apply pour appliquer');
  process.exit(0);
}

console.log('\n🚀 Application...');

// Dédupliquer les patches par ID (merge)
const contractPatchMap = new Map();
for (const { id, patch } of contractPatches) {
  if (!contractPatchMap.has(id)) contractPatchMap.set(id, {});
  Object.assign(contractPatchMap.get(id), patch);
}

let ok = 0, err = 0;
for (const [id, patch] of contractPatchMap) {
  const { error } = await sb.from('contracts').update(patch).eq('id', id);
  if (error) { console.error(`  ❌ contracts ${id}:`, error.message); err++; }
  else ok++;
}
console.log(`  Contracts: ${ok} OK, ${err} erreurs`);

ok = 0; err = 0;
for (const { id, patch } of clientPatches) {
  const { error } = await sb.from('clients').update(patch).eq('id', id);
  if (error) { console.error(`  ❌ clients ${id}:`, error.message); err++; }
  else ok++;
}
console.log(`  Clients: ${ok} OK, ${err} erreurs`);
console.log('\n✅ Terminé');
