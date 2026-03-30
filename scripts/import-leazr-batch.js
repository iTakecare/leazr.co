/**
 * import-leazr-batch.js
 *
 * Import générique Leazr — n'importe quelle période / CSV
 * Crée : demandes (offers) + offer_equipment + contracts (actifs) + invoices
 *
 * Usage:
 *   node scripts/import-leazr-batch.js --batch=2023-h2
 *   node scripts/import-leazr-batch.js --batch=2024
 *   node scripts/import-leazr-batch.js --batch=2023-h2 --dry-run
 *   node scripts/import-leazr-batch.js --batch=2023-h2 rollback
 *   node scripts/import-leazr-batch.js --batch=2023-h2 --patch
 *
 * Batches disponibles :
 *   2023-h1  → import-leazr-2023.csv  Jan–Jun 2023
 *   2023-h2  → import-leazr-2023.csv  Jul–Déc 2023
 *   2024     → import-leazr-2024.csv  Jan–Déc 2024
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const ADMIN_EMAIL          = 'hello@itakecare.be';

const CSV_BASE = '/Users/itakecare/Desktop/iTakecare/Clients';

// ── Définition des batches disponibles ────────────────────────────────────────
const BATCHES = {
  '2023-h1': { csv: `${CSV_BASE}/import-leazr-2023.csv`, fromMonth: 1,  toMonth: 6,  year: 2023 },
  '2023-h2': { csv: `${CSV_BASE}/import-leazr-2023.csv`, fromMonth: 7,  toMonth: 12, year: 2023 },
  '2024':    { csv: `${CSV_BASE}/import-leazr-2024.csv`, fromMonth: 1,  toMonth: 12, year: 2024 },
};

// ── Parse arguments ────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const batchArg   = (args.find(a => a.startsWith('--batch=')) || '').replace('--batch=', '');
const DRY_RUN    = args.includes('--dry-run');
const ROLLBACK   = args.includes('rollback');
const PATCH      = args.includes('--patch');

if (!batchArg || !BATCHES[batchArg]) {
  console.error(`\n❌ Batch requis. Valeurs possibles : ${Object.keys(BATCHES).join(', ')}`);
  console.error('   Ex: node scripts/import-leazr-batch.js --batch=2023-h2\n');
  process.exit(1);
}

const BATCH        = BATCHES[batchArg];
const MANIFEST_PATH = join(__dirname, `import-manifest-${batchArg}.json`);

// ── Supabase ───────────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseDate(d) {
  if (!d || !d.trim()) return null;
  const parts = d.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
}

function parseAmount(s) {
  if (!s || !s.trim()) return null;
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function inPeriod(dateStr) {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  return y === BATCH.year && m >= BATCH.fromMonth && m <= BATCH.toMonth;
}

function mapOfferStatus(csvStatus) {
  switch ((csvStatus || '').toLowerCase()) {
    case 'active':   return { status: 'accepted', workflow_status: 'financed' };
    case 'rejected': return { status: 'rejected', workflow_status: 'rejected' };
    case 'pending':  return { status: 'sent',     workflow_status: 'leaser_review' };
    default:         return { status: 'draft',    workflow_status: 'draft' };
  }
}

// ── CSV Parsing ────────────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(';');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, j) => obj[h] = (vals[j] ?? '').trim());
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ';' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function groupByDossier(rows) {
  const dossiers = [];
  let current = null;
  for (const row of rows) {
    if (row.dossier_number) {
      current = { ...row, equipmentLines: [] };
      dossiers.push(current);
    }
    if (current && row.equipment_title) {
      current.equipmentLines.push({
        title:          row.equipment_title,
        qty:            parseInt(row.equipment_qty, 10) || 1,
        purchase_price: parseAmount(row.equipment_price),
        selling_price:  parseAmount(row.equipment_selling_price),
      });
    }
  }
  return dossiers;
}

// ── DB helpers ─────────────────────────────────────────────────────────────────
async function insertOrDry(table, data, label) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] INSERT ${table}: ${JSON.stringify(data).slice(0, 100)}`);
    return { id: `dry-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  }
  const { data: inserted, error } = await sb.from(table).insert(data).select('id').single();
  if (error) throw new Error(`INSERT ${table} (${label}): ${error.message}`);
  return inserted;
}

async function insertManyOrDry(table, rows, label) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] INSERT ${table} (${rows.length} rows): ${label}`);
    return rows.map((_, i) => ({ id: `dry-${Date.now()}-${i}` }));
  }
  const { data: inserted, error } = await sb.from(table).insert(rows).select('id');
  if (error) throw new Error(`INSERT ${table} (${label}): ${error.message}`);
  return inserted;
}

// ── PATCH ──────────────────────────────────────────────────────────────────────
async function doPatch() {
  console.log(`\n🩹 PATCH [${batchArg}] — factures manquantes`);
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const failedDossiers = manifest.errors.filter(e => e.error?.includes('invoices')).map(e => e.dossier);
  if (!failedDossiers.length) { console.log('  ✅ Aucune facture manquante.'); return; }
  console.log(`  Dossiers : ${failedDossiers.join(', ')}`);

  const dossiers = groupByDossier(parseCSV(readFileSync(BATCH.csv, 'utf-8')))
    .filter(d => failedDossiers.includes(d.dossier_number));

  for (const d of dossiers) {
    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', d.dossier_number).eq('company_id', COMPANY_ID);
    const offerId = offers?.[0]?.id;
    if (!offerId) { console.error(`  ❌ Offer introuvable pour ${d.dossier_number}`); continue; }
    const { data: contracts } = await sb.from('contracts').select('id').eq('offer_id', offerId);
    const contractId = contracts?.[0]?.id || null;
    const payDate = parseDate(d.payment_date);
    const invDate = parseDate(d.invoice_date);
    const { data: inv, error } = await sb.from('invoices').insert({
      company_id: COMPANY_ID, offer_id: offerId, contract_id: contractId,
      invoice_number: d.invoice_number, invoice_date: invDate,
      created_at: invDate || parseDate(d.request_date),
      invoice_type: 'leasing', integration_type: 'manual',
      leaser_name: d.leaser_name || '', amount: parseAmount(d.financed_amount) ?? 0,
      status: payDate ? 'paid' : 'draft', paid_at: payDate,
      billing_data: { dossier_number: d.dossier_number, billing_entity: d.billing_entity_name },
    }).select('id').single();
    if (error) console.error(`  ❌ ${d.dossier_number} : ${error.message}`);
    else {
      manifest.invoices.push(inv.id);
      manifest.errors = manifest.errors.filter(e => e.dossier !== d.dossier_number);
      console.log(`  ✅ ${d.dossier_number} → facture créée`);
    }
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('✅ Patch terminé.');
}

// ── ROLLBACK ───────────────────────────────────────────────────────────────────
async function doRollback() {
  console.log(`\n🔄 ROLLBACK [${batchArg}]`);
  console.log('━'.repeat(60));
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (manifest.dry_run) { console.log('⚠️  DRY-RUN, rien à supprimer.'); return; }

  console.log(`  Batch   : ${manifest.batch_id}`);
  console.log(`  Créé le : ${manifest.created_at}`);

  const del = async (table, ids) => {
    if (!ids?.length) return;
    const valid = ids.filter(Boolean);
    if (!valid.length) return;
    const { error } = await sb.from(table).delete().in('id', valid);
    if (error) console.error(`  ❌ ${table}: ${error.message}`);
    else console.log(`  🗑️  ${table.padEnd(20)}: ${valid.length} supprimé(s)`);
  };

  await del('invoices', manifest.invoices);
  await del('contracts', manifest.contracts);
  await del('offer_equipment', manifest.offer_equipment);
  await del('offers', manifest.offers);

  const total = [manifest.invoices, manifest.contracts, manifest.offer_equipment, manifest.offers]
    .reduce((s, a) => s + (a?.length || 0), 0);
  console.log(`\n✅ Rollback terminé — ${total} enregistrement(s) supprimé(s)`);

  const archive = MANIFEST_PATH.replace('.json', `.rolled-back-${Date.now()}.json`);
  writeFileSync(archive, readFileSync(MANIFEST_PATH));
  writeFileSync(MANIFEST_PATH, JSON.stringify({ ...manifest, rolled_back_at: new Date().toISOString() }, null, 2));
  console.log(`📁 Archivé : ${archive}`);
}

// ── MAIN ───────────────────────────────────────────────────────────────────────
async function main() {
  if (PATCH)    { await doPatch();    return; }
  if (ROLLBACK) { await doRollback(); return; }

  console.log(`\n🚀 Import Leazr [${batchArg}]${DRY_RUN ? '  [DRY-RUN]' : ''}`);
  console.log(`   CSV    : ${BATCH.csv}`);
  console.log(`   Période: ${BATCH.fromMonth < 10 ? '0'+BATCH.fromMonth : BATCH.fromMonth}/${BATCH.year} → ${BATCH.toMonth < 10 ? '0'+BATCH.toMonth : BATCH.toMonth}/${BATCH.year}`);
  console.log('━'.repeat(60));

  // Données de référence
  const { data: authUsers } = await sb.auth.admin.listUsers();
  const USER_ID = authUsers?.users?.find(u => u.email === ADMIN_EMAIL)?.id;
  if (!USER_ID) throw new Error(`Utilisateur ${ADMIN_EMAIL} introuvable`);

  const { data: leasers } = await sb.from('leasers').select('id, name').eq('company_id', COMPANY_ID);
  const leaserByName = Object.fromEntries((leasers||[]).map(l => [l.name.toLowerCase(), l.id]));

  const { data: billingEntities } = await sb.from('billing_entities').select('id, name').eq('company_id', COMPANY_ID);
  const billingByName = Object.fromEntries((billingEntities||[]).map(b => [b.name.toLowerCase(), b.id]));

  console.log(`  ✅ User    : ${ADMIN_EMAIL}`);
  console.log(`  ✅ Leasers : ${(leasers||[]).map(l=>l.name).join(', ')}`);

  // CSV
  let content;
  try { content = readFileSync(BATCH.csv, 'utf-8'); }
  catch { throw new Error(`CSV non trouvé : ${BATCH.csv}`); }

  const allDossiers = groupByDossier(parseCSV(content));
  const dossiers    = allDossiers.filter(d => inPeriod(d.request_date));

  console.log(`\n  Total CSV          : ${allDossiers.length} dossiers`);
  console.log(`  Dans la période    : ${dossiers.length} dossiers`);
  console.log(`  → Actifs           : ${dossiers.filter(d=>d.status==='active').length}`);
  console.log(`  → Refusés          : ${dossiers.filter(d=>d.status==='rejected').length}`);
  console.log(`  → Autres           : ${dossiers.filter(d=>!['active','rejected'].includes(d.status)).length}`);

  const manifest = {
    batch_id:    `import-${batchArg}-${new Date().toISOString().slice(0,19).replace(/[^0-9]/g,'')}`,
    created_at:  new Date().toISOString(),
    dry_run:     DRY_RUN,
    offers:      [], offer_equipment: [], contracts: [], invoices: [], errors: [],
  };

  console.log(`\n🏷️  Batch ID : ${manifest.batch_id}`);
  console.log('\n📥 Import...\n' + '─'.repeat(60));

  let nOffers = 0, nContracts = 0, nInvoices = 0, nErrors = 0;

  for (const d of dossiers) {
    try {
      const clientName  = d.client_name || d.client_company || '';
      const leaserId    = leaserByName[(d.leaser_name||'').toLowerCase()] || null;
      const billingId   = billingByName[(d.billing_entity_name||'').toLowerCase()] || null;
      const reqDate     = parseDate(d.request_date);
      const startDate   = parseDate(d.contract_start_date);
      const endDate     = parseDate(d.contract_end_date);
      const invDate     = parseDate(d.invoice_date);
      const payDate     = parseDate(d.payment_date);
      const duration    = parseInt(d.contract_duration, 10) || null;
      const financed    = parseAmount(d.financed_amount);
      const monthly     = parseAmount(d.monthly_payment);
      const isActive    = d.status === 'active';
      const equipDescr  = d.equipmentLines.map(e => `${e.qty}x ${e.title}`).join(' | ');
      const { status: offerStatus, workflow_status: wfStatus } = mapOfferStatus(d.status);

      // Offer
      const offer = await insertOrDry('offers', {
        company_id: COMPANY_ID, user_id: USER_ID,
        client_id: d.client_id || null, client_name: clientName,
        status: offerStatus, workflow_status: wfStatus,
        converted_to_contract: isActive,
        dossier_number: d.dossier_number,
        request_date: reqDate, created_at: reqDate, updated_at: reqDate,
        monthly_payment: monthly ?? 0, amount: financed ?? 0, financed_amount: financed,
        contract_duration: duration, leaser_id: leaserId, billing_entity_id: billingId,
        business_sector: d.business_sector || null, source: d.source || null,
        equipment_description: equipDescr || null,
        remarks: [d.notes, `[${manifest.batch_id}]`].filter(Boolean).join(' | '),
      }, d.dossier_number);
      manifest.offers.push(offer.id);
      nOffers++;

      // Équipements
      if (d.equipmentLines.length > 0) {
        const inserted = await insertManyOrDry('offer_equipment', d.equipmentLines.map(e => ({
          offer_id: offer.id, title: e.title, quantity: e.qty,
          purchase_price: e.purchase_price ?? 0, selling_price: e.selling_price,
          duration: duration ?? 48, margin: 0,
          order_status: isActive ? 'received' : 'to_order',
        })), d.dossier_number);
        manifest.offer_equipment.push(...inserted.map(r => r.id));
      }

      // Contrat
      let contractId = null;
      if (isActive) {
        const contract = await insertOrDry('contracts', {
          company_id: COMPANY_ID, user_id: USER_ID, offer_id: offer.id,
          client_id: d.client_id || null, client_name: clientName,
          status: 'active', created_at: startDate || reqDate, updated_at: startDate || reqDate,
          monthly_payment: monthly ?? 0, leaser_name: d.leaser_name || '', leaser_id: leaserId,
          billing_entity_id: billingId, contract_number: d.contract_number || null,
          contract_start_date: startDate, contract_end_date: endDate, contract_duration: duration,
          dossier_date: reqDate, equipment_description: equipDescr || null,
          invoice_generated: !!d.invoice_number, invoice_date: invDate, payment_date: payDate,
          special_provisions: d.notes || null,
        }, d.dossier_number);
        contractId = contract.id;
        manifest.contracts.push(contract.id);
        nContracts++;
      }

      // Facture
      if (d.invoice_number?.trim()) {
        const invoice = await insertOrDry('invoices', {
          company_id: COMPANY_ID, offer_id: offer.id, contract_id: contractId,
          invoice_number: d.invoice_number, invoice_date: invDate,
          created_at: invDate || reqDate, updated_at: invDate || reqDate,
          invoice_type: 'leasing', integration_type: 'manual',
          leaser_name: d.leaser_name || '', amount: financed ?? 0,
          status: payDate ? 'paid' : 'draft', paid_at: payDate,
          billing_data: {
            client_name: clientName, client_id: d.client_id || null,
            dossier_number: d.dossier_number, billing_entity: d.billing_entity_name || null,
          },
        }, d.dossier_number);
        manifest.invoices.push(invoice.id);
        nInvoices++;
      }

      const suffix = [
        `${d.equipmentLines.length} équip.`,
        isActive ? '+ contrat' : null,
        d.invoice_number ? '+ facture' : null,
      ].filter(Boolean).join(' ');
      console.log(`  ✅ ${d.dossier_number.padEnd(18)} | ${(d.client_company||'').slice(0,28).padEnd(28)} | ${d.status.padEnd(8)} | ${suffix}`);

    } catch (err) {
      nErrors++;
      manifest.errors.push({ dossier: d.dossier_number, error: err.message });
      console.error(`  ❌ ${d.dossier_number} | ${err.message}`);
    }
  }

  if (!DRY_RUN) writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log('\n' + '━'.repeat(60));
  console.log(`✅  Offres    : ${nOffers}`);
  console.log(`✅  Contrats  : ${nContracts}`);
  console.log(`✅  Factures  : ${nInvoices}`);
  if (nErrors) console.log(`❌  Erreurs   : ${nErrors}`);
  if (DRY_RUN) console.log('\nℹ️  DRY-RUN — relancer sans --dry-run pour importer.');
  else {
    console.log(`\n💾 Manifest : ${MANIFEST_PATH}`);
    console.log(`🔄 Rollback : node scripts/import-leazr-batch.js --batch=${batchArg} rollback`);
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
