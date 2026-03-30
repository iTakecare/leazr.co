/**
 * sync-grenke-contracts.mjs
 *
 * Synchronise les contrats DB avec le fichier Grenke MyContracts-5.xlsx
 * Champs mis à jour : contract_number, contract_start_date, contract_end_date,
 *                     monthly_payment, contract_duration, status
 *
 * Usage : node scripts/sync-grenke-contracts.mjs           (dry-run)
 *         node scripts/sync-grenke-contracts.mjs --apply   (applique)
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

// ── 1. Charger tous les contrats DB avec leur financed_amount + company ───
const { data: contracts, error: ce } = await sb
  .from('contracts')
  .select('id, client_id, client_name, contract_number, monthly_payment, contract_start_date, contract_end_date, contract_duration, status, offer_id, leaser_name, is_self_leasing')
  .eq('company_id', COMPANY_ID)
  .ilike('leaser_name', '%grenke%')
  .neq('status', 'cancelled');

if (ce) { console.error('Erreur contracts:', ce.message); process.exit(1); }

// Charger financed_amount depuis les offers
const offerIds = contracts.map(c => c.offer_id).filter(Boolean);
const { data: offers } = offerIds.length
  ? await sb.from('offers').select('id, financed_amount').in('id', offerIds)
  : { data: [] };

// Charger company depuis les clients
const clientIds = [...new Set(contracts.map(c => c.client_id).filter(Boolean))];
const { data: clients } = clientIds.length
  ? await sb.from('clients').select('id, company').in('id', clientIds)
  : { data: [] };

const offerMap  = new Map((offers  || []).map(o => [o.id, o.financed_amount]));
const clientMap = new Map((clients || []).map(c => [c.id, c.company || '']));

const dbContracts = contracts.map(c => {
  const raw = offerMap.get(c.offer_id) || null;
  return {
    ...c,
    financed_amount: raw !== null ? Math.round(raw * 100) / 100 : null,
    company_name: clientMap.get(c.client_id) || '',
  };
});

// ── 2. Overrides manuels ──────────────────────────────────────────────────
// Forcer certains matches : grenke_contract_no → { name: fragment, minAmount?, maxAmount? }
// minAmount/maxAmount filtrent le contrat DB par financed_amount (utile si même client, 2 contrats)
const MANUAL_OVERRIDES = {
  // ── Conflits de montant identiques ───────────────────────────────────────
  '180-9728':  { name: 'loomans' },                   // JNS LIGHTING (4876) → Davy Loomans #1
  '180-9896':  { name: 'compere' },                   // COMPERE MAGALI → Magali Compere
  '180-14866': { name: 'mantoan' },                   // AMANTEX → Alessandro Mantoan
  '180-14871': { name: 'marson' },                    // MARSON KEVIN → Kevin Marson
  '180-9357':  { name: 'hansen', minAmount: 4000 },   // TAILOR MADE (4817) → Bernard Hansen #2
  '180-10851': { name: 'hansen', maxAmount: 3000 },   // TAILOR MADE (1962) → Bernard Hansen #1
  '180-10096': { name: 'cenci' },                     // CENCI MENUISERIE → Thibault Cenci (match via company_name "Cenci Menuiserie SRL")
  '180-9864':  { name: 'tytgat' },                    // TYTGAT ANTOINE → Antoine Tytgat
  '180-14828': { name: 'lumeau' },                    // VIC MNG SRL → Audry Lumeau #1
  '180-13660': { name: 'lumeau', minAmount: 7000 },   // VIC MNG → Audry Lumeau #2
  '180-12357': { name: 'loomans' },                   // JNS LIGHTING (2498) → Davy Loomans #2

  // ── Évidents par nom ─────────────────────────────────────────────────────
  '180-15083': { name: 'auvray' },                    // AUVRAY BENJAMIN → Benajmin Auvray
  '180-13646': { name: 'duchesne' },                  // DUCHESNE LOIC → Loic Duchesnes
  // '180-12750' supprimé : ancien contrat PP D'hondt, remplacé par 180-13683 (Fair Mobility SRL)
  '180-13658': { name: 'dumeunier' },                 // DUMEUNIER OLIVIER → Olivier Dumeunier
  '180-13736': { name: 'deravet' },                   // DERAVET DIGITAL → Francois Deravet
  '180-14467': { name: 'bayna' },                     // PHARMACIE BAYNA → Majda Bayna
  '180-12669': { name: 'gorskis', minAmount: 21000, maxAmount: 22000 }, // ATHENEE ROYAL X (20769) → Xavier Gorskis FA=21693 (montant DB)
  '180-10211': { name: 'gorskis', minAmount: 30000 },  // ATHENEE ROYAL X (34476) → Xavier Gorskis grand contrat
  '180-10407': { name: 'gorskis', minAmount: 14000, maxAmount: 15000 }, // ATHENEE ROYAL X (14503) → Xavier Gorskis (supprime ⚠️ score 0.00)
  '180-13951': { name: 'gayet', minAmount: 25000 },   // WINFINANCE (25629) → Zakaria Gayet FA=26411€ (montant DB divergent 781€)

  // ── Mappings société → personne (fichier utilisateur) ────────────────────
  '180-14851': { name: 'trouillet' },                 // AD HOC EVENTS → Samuel Trouillet
  '180-14788': { name: 'roels' },                     // CAP4HR → Valerie Roels #1
  '180-15136': { name: 'roels' },                     // CAP4HR → Valerie Roels #2
  '180-14081': { name: 'barbosa' },                   // CB 20 → Catherine Barbosa
  '180-14503': { name: 'ndudi', existingNumber: '180-14503' }, // COHEA SRL (4101€, 2026-01→2029-01) → confirme contrat existant
  '180-15039': { name: 'baudouin', minAmount: 3000 },  // CONNECT PARTNERS (3356) → Arnaud Baudouin FA=3350
  // '180-11445' supprimé : contrat Baudouin FA=735€ annulé → PASS 2 auto-match vers FA=1443€
  '180-15005': { name: 'vreese' },                    // DE VREESE DECO → Bastien de Vreese
  // ── Esteban Arriaga Miranda → EUROPEAN FOOD BANKS FEDERATION ASBL (4 contrats Grenke, tous divergents)
  '180-11064': { name: 'arriaga', existingNumber: '180-11064' },      // FOOD BANKS (18534€) → Arriaga FA=13700.73€ — après correction SQL swap 11064/12459
  '180-12459': { name: 'arriaga', existingNumber: '180-12459' },      // FOOD BANKS (2792€)  → Arriaga FA=1931.93€  — après correction SQL swap
  '180-14862': { name: 'arriaga', existingNumber: '180-14862' },      // FOOD BANKS (9256€)  → Arriaga FA=3362.95€ (confirme n° existant)
  '180-11447': { name: 'arriaga', existingNumber: '180-11447' },      // FOOD BANKS (3643€)  → Arriaga FA=8286.12€ (confirme n° existant)
  '180-13535': { name: 'lehette' },                   // EUTHYMIA → Nicolas Lehette #1
  '180-13683': { name: 'fair' },                      // FAIR MOBILTY → Frederic D'hondt #2 (via company_name)
  '180-14822': { name: 'wautelet' },                  // FAN'S HOLDING → Stephane Wautelet
  '180-14912': { name: 'foret' },                     // FORET MATERIEL → Benedicte Foret
  '180-15050': { name: 'vekeman' },                   // INFILISA → Nicolas Vekeman
  '180-13940': { name: 'burgeon', minAmount: 4000 },  // KAP-SERVICES (5024€) → Patrick Burgeon FA=5008€ (montant DB divergent)
  '180-15063': { name: 'burgeon' },                   // KAP-SERVICES BV (1160€) → Patrick Burgeon 2ème contrat
  // Kevin Jadin : PP → KJ CONSULT SRL. Même montant (3962€) → disambiguïté par existingNumber/noNumber
  '180-9324':  { name: 'jadin', existingNumber: '180-9324' },    // JADIN PP → confirme contrat existant (période PP)
  '180-14069': { name: 'jadin', existingNumber: '180-14069' },   // KJ CONSULT → contrat société (solde restant PP→société)
  '180-9171':  { name: 'vandensteen' },               // LEGAL AVENUE → Dorian Vandensteen
  '180-14559': { name: 'sergi' },                     // MARIE & CO → Marie Sergi #2
  '180-14002': { name: 'brousmiche' },                // NATHOLA → Lola Brousmiche
  '180-13139': { name: 'delchambre' },                // NEVER-2-LATE → Fabrice Delchambre
  '180-14259': { name: 'latini' },                    // NEW LATISTYL → Manu Latini
  '180-7889':  { name: 'bertaux', minAmount: 4000 },   // PIERRE BERTAUX SCS (3119€ Grenke) → Pierre Bertaux FA=4385€ (montant divergent)
  '180-13017': { name: 'bertaux', maxAmount: 4000 },  // PIERRE BERTAUX SCOMM → Pierre Bertaux (contrat antérieur)
  '180-14428': { name: 'fortin' },                    // RÉSILIENCE GROUPE → Nicolas Fortin
  // Romain Janssens : PP → RM TOITURE ET FERRONNERIE SRL. Même montant (4143€) → disambiguïté par existingNumber/noNumber
  '180-9043':  { name: 'janssens', existingNumber: '180-9043' }, // JANSSENS PP → confirme contrat existant (période PP)
  '180-11404': { name: 'janssens', existingNumber: '180-11404' }, // RM TOITURE → contrat société (solde restant PP→société)
  '180-11422': { name: 'bronsart' },                  // SKILLSET #1 → Fabrice Bronsart #1
  '180-14804': { name: 'bronsart' },                  // SKILLSET #2 → Fabrice Bronsart #2
  '180-12991': { name: 'huart' },                     // STARTUP VIE → Thierry Huart-Eeckout
  '180-15200': { name: 'halbrecq', existingNumber: '180-15200' }, // TALENTSQUARE (4655€) → Hubert Halbrecq (confirme contrat existant)
  '180-12480': { name: 'halbrecq', existingNumber: '180-12480' }, // TALENTSQUARE (5588€) → Thibaut Halbrecq FA=4273€ (montant DB divergent)
  '180-14870': { name: 'de cock' },                   // TDTA → Kevin De Cock
  '180-13895': { name: 'ganhy' },                     // TKM PARTNERS → Jonathan Ganhy
  '180-14498': { name: 'tosin' },                     // TOSIN NICOLAS → Nicolas Tosin
  '180-11827': { name: 'skhiri' },                     // PREPALUX → Choukri Skhiri
  '180-14024': { name: 'dewever', maxAmount: 3000 },  // IMMO PRESTIGE (2236€) → Sabrina Dewever FA=2212€ (montant DB divergent 24€)
  // 180-10227 (4510€) → 2ème contrat Dewever → auto-match PASS 2/3
  '180-14670': { name: 'hoffelinck' },                // V.T.S. SA → Eric Hoffelinck
  '180-13476': { name: 'varrasse' },                  // V-INFRA #1 → Thibaud Varrasse #1
  '180-13827': { name: 'varrasse' },                  // V-INFRA #2 → Thibaud Varrasse #2
  '180-14903': { name: 'jirikoff' },                  // WISE. ENERGY → Julien Jirikoff
  // ── Michelle Robinson ────────────────────────────────────────────────────
  // '180-7201': { name: 'robinson' },                 // supprimé — contrat + offre Robinson effacés (cleanup-dummy-offers.sql)
  // ── Rosine Ndudi → COHEA SRL. Même montant PP↔société → disambiguïté par existingNumber
  '180-8339':  { name: 'ndudi', existingNumber: '180-8339' },    // NDUDI PP (2786€, 2022-10→2025-10)
  '180-11347': { name: 'ndudi', existingNumber: '180-11347' },   // NDUDI PP (1384€, 2024-07→2027-07)
  '180-13620': { name: 'ndudi', existingNumber: '180-13620' },   // COHEA société (2786€, 2025-04→2025-10)
  '180-13616': { name: 'ndudi', existingNumber: '180-13616' },   // COHEA société (1384€, 2025-04→2027-07)
};

// ── 3. Matching Grenke → DB ───────────────────────────────────────────────
// Stratégie : pre-assign overrides d'abord, puis match par montant
const TOLERANCE = 1.00; // tolérance 1€ pour les écarts de centimes DB vs Grenke

// Index Grenke par numéro de contrat
const grenkeMap = new Map(GRENKE.map(g => [g.grenke_contract_no, g]));

// Index Grenke par montant
const grenkeByAmount = new Map();
for (const g of GRENKE) {
  const key = g.amount.toFixed(2);
  if (!grenkeByAmount.has(key)) grenkeByAmount.set(key, []);
  grenkeByAmount.get(key).push(g);
}

// Normaliser un nom pour comparaison
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Score de similarité basique (tokens communs)
function similarity(a, b) {
  const ta = new Set(normalizeName(a).split(' '));
  const tb = new Set(normalizeName(b).split(' '));
  let common = 0;
  for (const t of ta) if (tb.has(t) && t.length > 2) common++;
  return common / Math.max(ta.size, tb.size);
}

// Score max entre nom de personne et nom de société vs lessee Grenke
function bestScore(db, grenke_lessee) {
  const s1 = similarity(db.client_name, grenke_lessee);
  const s2 = db.company_name ? similarity(db.company_name, grenke_lessee) : 0;
  return Math.max(s1, s2);
}

const matched = [];
const unmatched = [];
const alreadyUsed = new Set(); // grenke_contract_no déjà utilisés
const matchedDbIds = new Set(); // DB contract IDs déjà matchés

// ── PASS 1 : Pré-assigner les overrides manuels ───────────────────────────
for (const [gNo, override] of Object.entries(MANUAL_OVERRIDES)) {
  const { name: dbFragment, minAmount, maxAmount, existingNumber, noNumber } = typeof override === 'string'
    ? { name: override }
    : override;

  const grenke = grenkeMap.get(gNo);
  if (!grenke) {
    console.warn(`⚠️  Override: Grenke ${gNo} introuvable dans le fichier`);
    continue;
  }
  if (alreadyUsed.has(gNo)) continue;

  const db = dbContracts.find(d => {
    if (matchedDbIds.has(d.id)) return false;
    const nameMatch = d.client_name.toLowerCase().includes(dbFragment) ||
                      (d.company_name && d.company_name.toLowerCase().includes(dbFragment));
    if (!nameMatch) return false;
    if (minAmount !== undefined && (d.financed_amount === null || d.financed_amount < minAmount)) return false;
    if (maxAmount !== undefined && (d.financed_amount === null || d.financed_amount > maxAmount)) return false;
    // existingNumber : ne matcher que le contrat qui a déjà CE numéro (confirme sans ambiguïté)
    if (existingNumber !== undefined && d.contract_number !== existingNumber) return false;
    // noNumber : ne matcher que les contrats sans numéro (nouveaux contrats PP→société)
    if (noNumber && d.contract_number !== null) return false;
    return true;
  });

  if (!db) {
    console.warn(`⚠️  Override: aucun contrat DB avec fragment "${dbFragment}"${minAmount ? ` minAmount=${minAmount}` : ''}${maxAmount ? ` maxAmount=${maxAmount}` : ''}`);
    continue;
  }

  alreadyUsed.add(gNo);
  matchedDbIds.add(db.id);
  matched.push({ db, grenke, forced: true });
}

// ── PASS 2 : Matching automatique par montant ─────────────────────────────
for (const db of dbContracts) {
  // Déjà matché par override
  if (matchedDbIds.has(db.id)) continue;

  if (!db.financed_amount) {
    unmatched.push({ db, reason: 'pas de financed_amount' });
    continue;
  }

  const amtKey = db.financed_amount.toFixed(2);
  const candidates = grenkeByAmount.get(amtKey) || [];

  let allCandidates = [...candidates];

  if (allCandidates.length === 0) {
    // Chercher avec tolérance
    let found = null;
    for (const [k, gs] of grenkeByAmount) {
      if (Math.abs(parseFloat(k) - db.financed_amount) <= TOLERANCE) {
        found = gs;
        break;
      }
    }
    if (!found) {
      unmatched.push({ db, reason: `aucun Grenke à ${db.financed_amount}€` });
      continue;
    }
    allCandidates = found;
  }

  // Filtrer ceux déjà utilisés
  const available = allCandidates.filter(g => !alreadyUsed.has(g.grenke_contract_no));

  if (available.length === 0) {
    unmatched.push({ db, reason: 'tous les candidats déjà utilisés' });
    continue;
  }

  // Si un seul candidat disponible → match direct
  if (available.length === 1) {
    alreadyUsed.add(available[0].grenke_contract_no);
    matchedDbIds.add(db.id);
    matched.push({ db, grenke: available[0] });
    continue;
  }

  // Plusieurs candidats → choisir par similarité (nom personne + société)
  const best = available
    .map(g => ({ g, score: bestScore(db, g.lessee) }))
    .sort((a, b) => b.score - a.score)[0];

  alreadyUsed.add(best.g.grenke_contract_no);
  matchedDbIds.add(db.id);
  matched.push({ db, grenke: best.g, nameScore: best.score });
}

// ── 4. Rapport ────────────────────────────────────────────────────────────
console.log('\n📊 RAPPORT DE MATCHING GRENKE → DB');
console.log('═'.repeat(70));
console.log(`✅ Matchés    : ${matched.length} / ${dbContracts.length}`);
console.log(`❌ Non matchés: ${unmatched.length}`);

if (unmatched.length > 0) {
  console.log('\n⚠️  Contrats DB non matchés :');
  for (const { db, reason } of unmatched) {
    console.log(`   ${db.client_name.padEnd(35)} FA=${db.financed_amount}€ — ${reason}`);
  }
}

// Matches avec score de nom faible (< 0.3) → à vérifier
const lowScore = matched.filter(m => m.nameScore !== undefined && m.nameScore < 0.3);
if (lowScore.length > 0) {
  console.log('\n⚠️  Matches à vérifier (similarité nom faible) :');
  for (const { db, grenke, nameScore } of lowScore) {
    const label = db.company_name ? `${db.client_name} (${db.company_name})` : db.client_name;
    console.log(`   DB: ${label.padEnd(50)} ↔  Grenke: ${grenke.lessee.padEnd(35)} (score: ${(nameScore||0).toFixed(2)}) FA=${db.financed_amount}€`);
  }
}

console.log('\n📋 Tous les matches :');
console.log('─'.repeat(100));
for (const m of matched) {
  const { db, grenke, nameScore } = m;
  const flag = m.forced ? ' 🔧(override)' : m.fallback ? ` 🔍(${db.company_name})` : (nameScore !== undefined && nameScore < 0.3) ? ' ⚠️' : '';
  console.log(`${grenke.grenke_contract_no.padEnd(12)} ${grenke.grenke_status.padEnd(20)} ${db.client_name.padEnd(35)} ↔ ${grenke.lessee}${flag}`);
}

// ── 5. Appliquer les mises à jour ─────────────────────────────────────────
// ── PASS 3 : Fallback matching par nom de société ─────────────────────────
// Pour les DB non matchés qui ont un company_name, chercher dans les Grenke non utilisés
const unmatchedDb = dbContracts.filter(d => !matchedDbIds.has(d.id) && d.company_name);
for (const db of unmatchedDb) {
  const available = GRENKE.filter(g => !alreadyUsed.has(g.grenke_contract_no));
  if (available.length === 0) break;

  const best = available
    .map(g => ({ g, score: similarity(db.company_name, g.lessee) }))
    .sort((a, b) => b.score - a.score)[0];

  if (best.score >= 0.4) {
    alreadyUsed.add(best.g.grenke_contract_no);
    matchedDbIds.add(db.id);
    matched.push({ db, grenke: best.g, nameScore: best.score, fallback: true });
  }
}

// ── Contrats Grenke non utilisés ─────────────────────────────────────────
const unusedGrenke = GRENKE.filter(g => !alreadyUsed.has(g.grenke_contract_no));
if (unusedGrenke.length > 0) {
  console.log(`\n📋 Grenke non utilisés (${unusedGrenke.length}) :`);
  console.log('─'.repeat(80));
  for (const g of unusedGrenke) {
    console.log(`${g.grenke_contract_no.padEnd(14)} ${g.lessee.padEnd(40)} ${g.amount}€`);
  }
}

if (!APPLY) {
  console.log('\n⚠️  DRY RUN — relance avec --apply pour appliquer les mises à jour');
  process.exit(0);
}

console.log('\n🔄 Application des mises à jour...');
let updated = 0;
let errors = 0;

for (const { db, grenke } of matched) {
  const patch = { contract_number: grenke.grenke_contract_no };
  if (grenke.start_date)      patch.contract_start_date = grenke.start_date;
  if (grenke.end_date)        patch.contract_end_date   = grenke.end_date;
  if (grenke.monthly_payment) patch.monthly_payment     = grenke.monthly_payment;
  if (grenke.duration)        patch.contract_duration   = grenke.duration;
  if (grenke.leazr_status)    patch.status              = grenke.leazr_status;

  const { error } = await sb.from('contracts').update(patch).eq('id', db.id);
  if (error) {
    console.error(`  ❌ ${db.client_name}: ${error.message}`);
    errors++;
  } else {
    updated++;
  }
}

console.log(`\n✅ ${updated} contrats mis à jour`);
if (errors > 0) console.log(`❌ ${errors} erreurs`);
