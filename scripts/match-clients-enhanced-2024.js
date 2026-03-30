/**
 * match-clients-enhanced-2024.js
 *
 * Pour chaque facture leasing 2024 :
 *  1. Suit offer.client_id → clients table (source de vérité)
 *  2. Pour les cas sans client_id ou mismatch : recherche floue dans la DB
 *  3. Affiche rapport complet avec valeurs DB et suggestions
 *  4. Avec --update : applique toutes les corrections confirmées
 *
 * Correspondances confirmées manuellement :
 *   "Bastien Heyderickx"            → chercher Apik SRL en DB
 *   "Nicolas Ceron"                 → Xavier Gorskis / Athénée Royal Saint Ghislain
 *   "Gregory Ilnicki - Infra Route" → chercher Infra Route SRL en DB
 *
 * Usage :
 *   node scripts/match-clients-enhanced-2024.js            → rapport
 *   node scripts/match-clients-enhanced-2024.js --update   → applique corrections
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const args   = process.argv.slice(2);
const UPDATE = args.includes('--update');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ─── Correspondances manuelles confirmées ──────────────────────────────────
// clé = nom tel qu'il apparaît dans billing_data (toLowerCase + trim)
// valeur = { searchCompany, searchName } pour trouver en DB
const MANUAL_OVERRIDES = {
  'bastien heyderickx':             { searchCompany: 'apik',        searchName: null },
  'nicolas ceron':                   { searchName:    'gorski',      searchCompany: null },
  'gregory ilnicki - infra route':   { searchCompany: 'infra route', searchName: null },
  'gregory ilnicki':                 { searchCompany: 'infra route', searchName: null },
};

// ─── Recherche floue dans la table clients ─────────────────────────────────
async function fuzzySearch(name, company) {
  const keywords = [];

  // Extraire les mots significatifs du nom (> 3 lettres)
  if (name) {
    const parts = name.replace(/[-–]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    keywords.push(...parts);
  }
  if (company) {
    const parts = company.replace(/[-–]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    keywords.push(...parts);
  }

  if (!keywords.length) return [];

  // Construire filtre OR sur name et company
  const filters = keywords.flatMap(w => [
    `name.ilike.%${w}%`,
    `company.ilike.%${w}%`,
  ]).join(',');

  const { data, error } = await sb
    .from('clients')
    .select('id, name, company, email, first_name, last_name')
    .eq('company_id', COMPANY_ID)
    .or(filters)
    .limit(5);

  if (error) return [];
  return data || [];
}

// ─── Recherche forcée par override ────────────────────────────────────────
async function overrideSearch(override) {
  const filters = [];
  if (override.searchName)    filters.push(`name.ilike.%${override.searchName}%`);
  if (override.searchCompany) filters.push(`company.ilike.%${override.searchCompany}%`);
  if (!filters.length) return [];

  const { data } = await sb
    .from('clients')
    .select('id, name, company, email, first_name, last_name')
    .eq('company_id', COMPANY_ID)
    .or(filters.join(','))
    .limit(5);
  return data || [];
}

// ─── Nom affiché d'un client DB ───────────────────────────────────────────
function clientDisplayName(c) {
  return c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
}

async function main() {
  console.log(`\n🔍 MATCHING CLIENTS 2024 — RAPPORT ENRICHI ${UPDATE ? '[UPDATE]' : '[RAPPORT]'}\n`);

  // 1. Factures leasing 2024
  const { data: invoices, error: ie } = await sb
    .from('invoices')
    .select('id, invoice_number, offer_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2024-12-31')
    .order('invoice_number');
  if (ie) { console.error('❌ invoices:', ie.message); return; }

  // 2. Offers
  const offerIds = [...new Set(invoices.map(i => i.offer_id).filter(Boolean))];
  const { data: offers } = await sb
    .from('offers')
    .select('id, client_id, client_name, dossier_number')
    .in('id', offerIds);
  const offerMap = new Map((offers || []).map(o => [o.id, o]));

  // 3. Clients via client_id
  const clientIds = [...new Set((offers || []).map(o => o.client_id).filter(Boolean))];
  const { data: clients } = clientIds.length
    ? await sb.from('clients').select('id, name, company, email, first_name, last_name').in('id', clientIds)
    : { data: [] };
  const clientMap = new Map((clients || []).map(c => [c.id, c]));

  // ─── Rapport ─────────────────────────────────────────────────────────────
  console.log(`${'Invoice'.padEnd(20)} ${'Billing_data actuel'.padEnd(35)} ${'DB (via client_id)'.padEnd(35)} ${'Entreprise DB'.padEnd(30)} Statut`);
  console.log('─'.repeat(155));

  const toUpdate   = [];   // corrections automatiques (via client_id)
  const needsReview = []; // cas à traiter manuellement ou par override

  for (const inv of invoices) {
    const currentName = (
      inv.billing_data?.contract_data?.client_name ||
      inv.billing_data?.client_name || ''
    ).trim();

    const offer  = offerMap.get(inv.offer_id);
    const client = offer ? clientMap.get(offer.client_id) : null;

    if (client) {
      const dbName    = clientDisplayName(client);
      const dbCompany = client.company || '';
      const normalizedCurrent = currentName.toLowerCase().replace(/\s+/g,' ');
      const normalizedDb      = dbName.toLowerCase().replace(/\s+/g,' ');
      const isSame = normalizedCurrent === normalizedDb;

      const status = isSame ? '✅' : '🔄';
      console.log(`${inv.invoice_number.padEnd(20)} ${currentName.padEnd(35)} ${dbName.padEnd(35)} ${dbCompany.padEnd(30)} ${status}`);

      if (!isSame) {
        toUpdate.push({
          invoiceId: inv.id,
          invoice_number: inv.invoice_number,
          currentName,
          dbName,
          dbCompany,
          clientId: client.id,
          billing_data: inv.billing_data,
          source: 'client_id',
        });
      }
      continue;
    }

    // Pas de client via client_id → override ou fuzzy
    const overrideKey = currentName.toLowerCase().replace(/\s+/g,' ');
    let overrideEntry = null;
    for (const [k, v] of Object.entries(MANUAL_OVERRIDES)) {
      if (overrideKey.includes(k)) { overrideEntry = v; break; }
    }

    const candidates = overrideEntry
      ? await overrideSearch(overrideEntry)
      : await fuzzySearch(currentName, offer?.client_name);

    if (candidates.length === 0) {
      console.log(`${inv.invoice_number.padEnd(20)} ${currentName.padEnd(35)} ${'(aucune correspondance)'.padEnd(35)} ${''.padEnd(30)} ❓ inconnu`);
      needsReview.push({ inv, offer, currentName, reason: 'non trouvé en DB', candidates: [] });
    } else if (candidates.length === 1) {
      const c = candidates[0];
      const dbName    = clientDisplayName(c);
      const dbCompany = c.company || '';
      console.log(`${inv.invoice_number.padEnd(20)} ${currentName.padEnd(35)} ${dbName.padEnd(35)} ${dbCompany.padEnd(30)} 🔎 1 candidat`);
      needsReview.push({ inv, offer, currentName, reason: '1 candidat (fuzzy)', candidates, bestMatch: c });
    } else {
      const names = candidates.map(c => `"${clientDisplayName(c)}" (${c.company || '?'})`).join(' | ');
      console.log(`${inv.invoice_number.padEnd(20)} ${currentName.padEnd(35)} ${names.substring(0,35).padEnd(35)} ${''.padEnd(30)} 🔎 ${candidates.length} candidats`);
      needsReview.push({ inv, offer, currentName, reason: `${candidates.length} candidats`, candidates });
    }
  }

  console.log('─'.repeat(155));
  console.log(`\n  ✅ Déjà corrects       : ${invoices.length - toUpdate.length - needsReview.length}`);
  console.log(`  🔄 Correction auto.    : ${toUpdate.length}`);
  console.log(`  🔎 Nécessite révision  : ${needsReview.length}`);

  // ─── Détail des cas à réviser ────────────────────────────────────────────
  if (needsReview.length > 0) {
    console.log('\n══ DÉTAIL CAS À RÉVISER ══════════════════════════════════════════════\n');
    for (const r of needsReview) {
      console.log(`  📄 ${r.inv.invoice_number}`);
      console.log(`     Billing_data actuel : "${r.currentName}"`);
      console.log(`     offer.client_name   : "${r.offer?.client_name || '(null)'}"`);
      console.log(`     Raison              : ${r.reason}`);
      if (r.candidates.length > 0) {
        console.log(`     Candidats DB :`);
        for (const c of r.candidates) {
          console.log(`       → id=${c.id}`);
          console.log(`         name="${clientDisplayName(c)}" | company="${c.company || ''}" | email="${c.email || ''}"`);
        }
      }
      console.log();
    }
  }

  // ─── Corrections automatiques ─────────────────────────────────────────
  if (toUpdate.length > 0) {
    console.log('\n══ CORRECTIONS AUTOMATIQUES (via client_id) ══════════════════════════\n');
    for (const u of toUpdate) {
      console.log(`  🔄 ${u.invoice_number}: "${u.currentName}" → "${u.dbName}" (${u.dbCompany})`);
    }
  }

  if (!UPDATE) {
    console.log('\n  → Relance avec --update pour appliquer les corrections automatiques\n');
    return;
  }

  // ─── Application des mises à jour automatiques ────────────────────────
  console.log(`\n🔧 APPLICATION ${toUpdate.length} CORRECTIONS\n`);
  let nUpdated = 0;
  for (const u of toUpdate) {
    const newBillingData = {
      ...(u.billing_data || {}),
      contract_data: {
        ...(u.billing_data?.contract_data || {}),
        client_name:    u.dbName,
        client_company: u.dbCompany,
      },
      client_name: u.dbName,
    };
    const { error } = await sb
      .from('invoices')
      .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
      .eq('id', u.invoiceId);
    if (error) {
      console.log(`  ❌ ${u.invoice_number}: ${error.message}`);
    } else {
      console.log(`  ✅ ${u.invoice_number}: "${u.currentName}" → "${u.dbName}"`);
      nUpdated++;
    }
  }
  console.log(`\n  Mis à jour: ${nUpdated} / ${toUpdate.length}\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
