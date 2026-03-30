/**
 * analyze-2023-state.js
 *
 * Analyse l'état actuel de la DB pour 2023 et compare avec la table de référence.
 * Montre mois par mois : DB existante + CSV disponible vs référence.
 *
 * Usage: node scripts/analyze-2023-state.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const CSV_PATH             = '/Users/itakecare/Desktop/iTakecare/Clients/import-leazr-2023.csv';

// Table de référence (image fournie)
const REF = {
  1:  { ca: 69669.00,  marge: 30921.05 },
  2:  { ca: 78657.58,  marge: 26326.84 },
  3:  { ca: 72435.29,  marge: 26913.17 },
  4:  { ca: 24048.59,  marge:  9936.72 },
  5:  { ca: 16863.40,  marge:  4553.16 },
  6:  { ca:  3047.26,  marge:  1453.93 },
  7:  { ca:     0.00,  marge:     0.00 },
  8:  { ca:  9509.14,  marge:  3700.14 },
  9:  { ca: 40562.64,  marge: 16954.46 },
  10: { ca:  2865.85,  marge:   626.85 },
  11: { ca: 47543.13,  marge: 19398.63 },
  12: { ca: 53199.26,  marge: 14843.55 },
};

const MOIS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function parseAmount(s) {
  if (!s || !s.trim()) return 0;
  try { return parseFloat(s.trim().replace(/\s/g,'').replace(',','.')); } catch { return 0; }
}

function parseDate(d) {
  if (!d || !d.trim()) return null;
  const p = d.trim().split('/');
  if (p.length !== 3) return null;
  try { return { y: parseInt(p[2]), m: parseInt(p[1]), d: parseInt(p[0]) }; } catch { return null; }
}

// Parse CSV
function parseCSV(content) {
  const lines = content.replace(/\r\n/g,'\n').split('\n');
  const headers = lines[0].replace(/^\uFEFF/,'').split(';');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = lines[i].split(';');
    const obj = {};
    headers.forEach((h,j) => obj[h] = (vals[j]??'').trim());
    rows.push(obj);
  }
  return rows;
}

function groupDossiers(rows) {
  const dossiers = [];
  let cur = null;
  for (const row of rows) {
    if (row.dossier_number) { cur = {...row, equipment:[]}; dossiers.push(cur); }
    if (cur && row.equipment_title) cur.equipment.push({
      title: row.equipment_title,
      qty: parseInt(row.equipment_qty||'1')||1,
      purchase: parseAmount(row.equipment_price),
      selling: parseAmount(row.equipment_selling_price),
    });
  }
  return dossiers;
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth:{persistSession:false,autoRefreshToken:false} });

async function main() {
  console.log('\n📊 Analyse état 2023 — DB vs CSV vs Référence');
  console.log('═'.repeat(80));

  // 1. Charger la DB — toutes les offres actives 2023
  const { data: dbOffers, error } = await sb
    .from('offers')
    .select('id, dossier_number, client_name, amount, financed_amount, created_at, remarks, workflow_status')
    .eq('company_id', COMPANY_ID)
    .in('workflow_status', ['financed','accepted','validated','contract_sent','signed','contract_signed'])
    .gte('created_at', '2023-01-01')
    .lte('created_at', '2023-12-31');

  if (error) throw new Error('DB error: ' + error.message);
  console.log(`\n✅ DB : ${dbOffers.length} offres actives trouvées pour 2023`);

  // Récupérer les contrats pour avoir les montants corrects
  const { data: dbContracts } = await sb
    .from('contracts')
    .select('id, offer_id, monthly_payment, dossier_number, client_name')
    .eq('company_id', COMPANY_ID)
    .gte('created_at', '2023-01-01')
    .lte('created_at', '2023-12-31');

  const contractByOfferId = {};
  (dbContracts||[]).forEach(c => { contractByOfferId[c.offer_id] = c; });

  // Récupérer les équipements pour calculer les achats
  const offerIds = dbOffers.map(o => o.id);
  let dbEquipment = [];
  if (offerIds.length > 0) {
    const { data: eq } = await sb.from('offer_equipment').select('offer_id, quantity, purchase_price, selling_price').in('offer_id', offerIds);
    dbEquipment = eq || [];
  }
  const eqByOffer = {};
  for (const e of dbEquipment) {
    if (!eqByOffer[e.offer_id]) eqByOffer[e.offer_id] = [];
    eqByOffer[e.offer_id].push(e);
  }

  // Grouper DB par mois (basé sur created_at = date de la demande)
  const dbByMonth = {};
  for (let m = 1; m <= 12; m++) dbByMonth[m] = [];
  for (const o of dbOffers) {
    const d = new Date(o.created_at);
    const m = d.getMonth() + 1;
    const ca = o.financed_amount || o.amount || 0;
    const eq = eqByOffer[o.id] || [];
    const achat = eq.reduce((s,e) => s + (e.purchase_price||0)*(e.quantity||1), 0);
    dbByMonth[m].push({
      dossier: o.dossier_number, client: o.client_name,
      ca, achat, marge: ca - achat,
      fromImport: o.remarks && o.remarks.includes('[import-2023-'),
    });
  }

  // 2. Charger le CSV
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const allDossiers = groupDossiers(parseCSV(csvContent));
  const activeDossiers = allDossiers.filter(d => d.status === 'active');

  // Grouper CSV par mois (contract_start_date)
  const csvByMonth = {};
  for (let m = 1; m <= 12; m++) csvByMonth[m] = [];
  for (const d of activeDossiers) {
    const dt = parseDate(d.contract_start_date) || parseDate(d.request_date);
    if (!dt || dt.y !== 2023) continue;
    const ca = parseAmount(d.financed_amount);
    const achat = d.equipment.reduce((s,e) => s + e.purchase * e.qty, 0);
    csvByMonth[dt.m].push({ dossier: d.dossier_number, client: d.client_company||d.client_name, ca, achat, marge: ca-achat, nb: d.equipment.reduce((s,e)=>s+e.qty,0) });
  }

  // 3. Afficher mois par mois
  let totalDbCA=0, totalCsvCA=0, totalRefCA=0, totalDbM=0, totalCsvM=0, totalRefM=0;
  for (let m = 1; m <= 12; m++) {
    const ref = REF[m];
    const db = dbByMonth[m];
    const csv = csvByMonth[m];
    const dbCA = db.reduce((s,r)=>s+r.ca,0);
    const csvCA = csv.reduce((s,r)=>s+r.ca,0);
    const dbM = db.reduce((s,r)=>s+r.marge,0);
    const csvM = csv.reduce((s,r)=>s+r.marge,0);
    totalDbCA+=dbCA; totalCsvCA+=csvCA; totalRefCA+=ref.ca;
    totalDbM+=dbM; totalCsvM+=csvM; totalRefM+=ref.marge;

    const statusCA = Math.abs(dbCA-ref.ca)<0.05 ? '✅' : (dbCA>ref.ca?'⚠️ TROP':'❌ MANQUE');
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📅 ${MOIS[m].toUpperCase()}  |  DB: ${dbCA.toFixed(2)}€  |  CSV dispo: ${csvCA.toFixed(2)}€  |  Réf: ${ref.ca.toFixed(2)}€  ${statusCA}`);
    console.log(`   Marge→  DB: ${dbM.toFixed(2)}€  |  CSV: ${csvM.toFixed(2)}€  |  Réf: ${ref.marge.toFixed(2)}€`);

    if (db.length) {
      console.log(`\n   🗄️  En DB (${db.length}) :`);
      for (const r of db) console.log(`      ${r.fromImport?'[import]':'[original]'} ${r.dossier.padEnd(20)} ${(r.client||'').slice(0,30).padEnd(30)} CA=${r.ca.toFixed(2).padStart(10)}€  Marge=${r.marge.toFixed(2).padStart(10)}€`);
    }
    if (csv.length) {
      const csvDossiers = new Set(csv.map(c=>c.dossier));
      const dbDossiers = new Set(db.map(d=>d.dossier));
      const newInCsv = csv.filter(c => !dbDossiers.has(c.dossier));
      console.log(`\n   📄 Dans CSV (${csv.length}, dont ${newInCsv.length} nouveaux) :`);
      for (const r of csv) {
        const exists = dbDossiers.has(r.dossier);
        console.log(`      ${exists?'[déjà en DB]':'[à importer]'} ${r.dossier.padEnd(20)} ${(r.client||'').slice(0,30).padEnd(30)} CA=${r.ca.toFixed(2).padStart(10)}€  Marge=${r.marge.toFixed(2).padStart(10)}€  Eq=${r.nb}`);
      }
    }

    const remaining = ref.ca - dbCA;
    if (Math.abs(remaining) > 0.05) {
      console.log(`\n   ⚠️  Écart après DB: ${remaining.toFixed(2)}€ de CA manquant/excédentaire vs référence`);
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 TOTAUX:`);
  console.log(`   DB actuelle  : CA=${totalDbCA.toFixed(2)}€  Marge=${totalDbM.toFixed(2)}€`);
  console.log(`   CSV dispo    : CA=${totalCsvCA.toFixed(2)}€  Marge=${totalCsvM.toFixed(2)}€`);
  console.log(`   Référence    : CA=${totalRefCA.toFixed(2)}€  Marge=${totalRefM.toFixed(2)}€`);
  console.log(`   Écart DB/Réf : CA=${(totalDbCA-totalRefCA).toFixed(2)}€  Marge=${(totalDbM-totalRefM).toFixed(2)}€`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
