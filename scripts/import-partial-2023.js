/**
 * import-partial-2023.js
 *
 * Import partiel Leazr — Janvier à Juin 2023
 * Crée : demandes (offers) + lignes équipement (offer_equipment)
 *        + contrats (contracts) pour les dossiers actifs
 *        + factures (invoices) si numéro de facture présent
 *
 * Chaque enregistrement est tagué via le champ remarks/notes avec le batch_id
 * ET toutes les IDs créées sont sauvegardées dans un fichier manifest JSON
 * pour permettre un rollback complet.
 *
 * Usage:
 *   node scripts/import-partial-2023.js           ← import
 *   node scripts/import-partial-2023.js rollback  ← annule le dernier import
 *   node scripts/import-partial-2023.js --patch   ← insère les factures manquantes du dernier import
 *   node scripts/import-partial-2023.js --dry-run ← simulation sans écriture
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const COMPANY_ID    = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';  // iTakecare
const ADMIN_EMAIL   = 'hello@itakecare.be';                     // Gianni

const CSV_PATH      = '/Users/itakecare/Desktop/iTakecare/Clients/import-leazr-2023.csv';
const MANIFEST_PATH = join(__dirname, 'import-manifest-2023-h1.json');

const DRY_RUN     = process.argv.includes('--dry-run');
const ROLLBACK    = process.argv[2] === 'rollback';
const PATCH       = process.argv.includes('--patch');
const FIX_STATUS  = process.argv.includes('--fix-status');

const IMPORT_PERIOD = { yearFrom: 2023, monthFrom: 1, yearTo: 2023, monthTo: 6 };

// ── Supabase ───────────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/** DD/MM/YYYY → YYYY-MM-DD  (null si vide ou invalide) */
function parseDate(d) {
  if (!d || !d.trim()) return null;
  const parts = d.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
}

/** "1 256,77" ou "1256,77" → 1256.77 */
function parseAmount(s) {
  if (!s || !s.trim()) return null;
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Retourne true si la date est dans la période Jan-Jun 2023 */
function inPeriod(dateStr) {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  return y === IMPORT_PERIOD.yearFrom
      && m >= IMPORT_PERIOD.monthFrom
      && m <= IMPORT_PERIOD.monthTo;
}

/** Mapping statut CSV → { status, workflow_status } pour Leazr */
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

/** Groupe les lignes CSV par dossier (première ligne = header dossier, suivantes = équipements supplémentaires) */
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

// ── DB insert helpers ──────────────────────────────────────────────────────────

async function insertOrDry(table, data, label) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] INSERT ${table}:`, JSON.stringify(data).slice(0, 120));
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

// ── PATCH : insère les factures manquantes du dernier import ──────────────────
async function doPatch() {
  console.log('\n🩹 PATCH — insertion des factures manquantes');
  console.log('━'.repeat(60));

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest introuvable : ${MANIFEST_PATH}`); process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const failedDossiers = manifest.errors
    .filter(e => e.error && e.error.includes('invoices'))
    .map(e => e.dossier);

  if (!failedDossiers.length) {
    console.log('  ✅ Aucune facture manquante dans le manifest.'); return;
  }
  console.log(`  Dossiers à patcher : ${failedDossiers.join(', ')}`);

  const content = readFileSync(CSV_PATH, 'utf-8');
  const allRows = parseCSV(content);
  const dossiers = groupByDossier(allRows).filter(d => failedDossiers.includes(d.dossier_number));

  for (const d of dossiers) {
    // Retrouver l'offer_id via dossier_number
    const { data: existingOffers } = await sb.from('offers')
      .select('id').eq('dossier_number', d.dossier_number).eq('company_id', COMPANY_ID);
    const offerId = existingOffers?.[0]?.id;
    if (!offerId) { console.error(`  ❌ Offer introuvable pour ${d.dossier_number}`); continue; }

    // Retrouver le contract_id
    const { data: existingContracts } = await sb.from('contracts')
      .select('id').eq('offer_id', offerId);
    const contractId = existingContracts?.[0]?.id || null;

    const payDate  = parseDate(d.payment_date);
    const invDate  = parseDate(d.invoice_date);
    const financed = parseAmount(d.financed_amount);

    const invoiceData = {
      company_id:       COMPANY_ID,
      offer_id:         offerId,
      contract_id:      contractId,
      invoice_number:   d.invoice_number,
      invoice_date:     invDate,
      invoice_type:     'leasing',
      integration_type: 'manual',
      leaser_name:      d.leaser_name || '',
      amount:           financed ?? 0,
      status:           payDate ? 'paid' : 'draft',
      paid_at:          payDate,
      billing_data:     {
        client_name:    d.client_name || d.client_company,
        client_id:      d.client_id || null,
        dossier_number: d.dossier_number,
        billing_entity: d.billing_entity_name || null,
      },
    };

    const { data: newInvoice, error } = await sb.from('invoices').insert(invoiceData).select('id').single();
    if (error) {
      console.error(`  ❌ ${d.dossier_number} : ${error.message}`);
    } else {
      manifest.invoices.push(newInvoice.id);
      // Retirer l'erreur du manifest
      manifest.errors = manifest.errors.filter(e => e.dossier !== d.dossier_number);
      console.log(`  ✅ ${d.dossier_number} | ${d.client_company} → facture ${newInvoice.id}`);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('\n✅ Patch terminé — manifest mis à jour.');
}

// ── FIX-STATUS : corrige le statut des offres actives déjà importées ──────────
async function doFixStatus() {
  console.log('\n🔧 FIX-STATUS — mise à jour des statuts offers → approved');
  console.log('━'.repeat(60));

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest introuvable : ${MANIFEST_PATH}`); process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

  // Récupérer les offer_ids qui ont un contrat associé (= dossiers actifs)
  const offerIdsWithContract = new Set();
  for (const contractId of (manifest.contracts || [])) {
    const { data } = await sb.from('contracts').select('offer_id').eq('id', contractId).single();
    if (data?.offer_id) offerIdsWithContract.add(data.offer_id);
  }

  const activeOfferIds = [...offerIdsWithContract];
  const rejectedOfferIds = (manifest.offers || []).filter(id => !offerIdsWithContract.has(id));

  console.log(`  Offres actives à passer en "approved"  : ${activeOfferIds.length}`);
  console.log(`  Offres refusées à passer en "rejected" : ${rejectedOfferIds.length}`);

  if (activeOfferIds.length) {
    const { error } = await sb.from('offers')
      .update({ status: 'approved', converted_to_contract: true })
      .in('id', activeOfferIds);
    if (error) console.error('  ❌ Erreur update approved:', error.message);
    else console.log(`  ✅ ${activeOfferIds.length} offres → approved`);
  }

  if (rejectedOfferIds.length) {
    const { error } = await sb.from('offers')
      .update({ status: 'rejected' })
      .in('id', rejectedOfferIds);
    if (error) console.error('  ❌ Erreur update rejected:', error.message);
    else console.log(`  ✅ ${rejectedOfferIds.length} offres → rejected`);
  }

  console.log('\n✅ Statuts corrigés.');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {

  // ── MODE FIX-STATUS ──────────────────────────────────────────────────────────
  if (FIX_STATUS) {
    await doFixStatus();
    return;
  }

  // ── MODE PATCH ───────────────────────────────────────────────────────────────
  if (PATCH) {
    await doPatch();
    return;
  }

  // ── MODE ROLLBACK ────────────────────────────────────────────────────────────
  if (ROLLBACK) {
    await doRollback();
    return;
  }

  console.log(`\n🚀 Import partiel Leazr — Jan–Jun 2023${DRY_RUN ? '  [DRY-RUN]' : ''}`);
  console.log('━'.repeat(60));

  // 1. Charger les données de référence
  console.log('\n📡 Chargement des données de référence...');

  const { data: authUsers } = await sb.auth.admin.listUsers();
  const adminUser = authUsers?.users?.find(u => u.email === ADMIN_EMAIL);
  if (!adminUser) throw new Error(`Utilisateur ${ADMIN_EMAIL} introuvable`);
  const USER_ID = adminUser.id;
  console.log(`  ✅ User : ${ADMIN_EMAIL} → ${USER_ID}`);

  const { data: leasers } = await sb.from('leasers').select('id, name').eq('company_id', COMPANY_ID);
  const leaserByName = Object.fromEntries((leasers || []).map(l => [l.name.toLowerCase(), l.id]));
  console.log(`  ✅ Leasers : ${(leasers||[]).map(l=>l.name).join(', ')}`);

  const { data: billingEntities } = await sb.from('billing_entities').select('id, name').eq('company_id', COMPANY_ID);
  const billingByName = Object.fromEntries((billingEntities || []).map(b => [b.name.toLowerCase(), b.id]));
  console.log(`  ✅ Entités de facturation : ${(billingEntities||[]).map(b=>b.name).join(', ')}`);

  // 2. Parser le CSV
  console.log('\n📄 Lecture du CSV 2023...');
  let content;
  try { content = readFileSync(CSV_PATH, 'utf-8'); }
  catch (e) { throw new Error(`Fichier CSV non trouvé : ${CSV_PATH}`); }

  const allRows   = parseCSV(content);
  const allDossiers = groupByDossier(allRows);
  const dossiers  = allDossiers.filter(d => inPeriod(d.request_date));

  console.log(`  Total dossiers 2023     : ${allDossiers.length}`);
  console.log(`  Dossiers Jan–Jun 2023   : ${dossiers.length}`);
  console.log(`  → Actifs  : ${dossiers.filter(d=>d.status==='active').length}`);
  console.log(`  → Refusés : ${dossiers.filter(d=>d.status==='rejected').length}`);
  console.log(`  → Autres  : ${dossiers.filter(d=>d.status==='pending').length}`);

  // 3. Manifest pour rollback
  const manifest = {
    batch_id:   `import-2023-h1-${new Date().toISOString().slice(0,19).replace(/[^0-9]/g,'')}`,
    created_at: new Date().toISOString(),
    dry_run:    DRY_RUN,
    offers:     [],
    offer_equipment: [],
    contracts:  [],
    invoices:   [],
    errors:     [],
  };

  console.log(`\n🏷️  Batch ID : ${manifest.batch_id}`);
  console.log('\n📥 Import en cours...');
  console.log('─'.repeat(60));

  let nOffers = 0, nContracts = 0, nInvoices = 0, nErrors = 0;

  for (const d of dossiers) {
    try {
      const clientName  = d.client_name  || d.client_company || '';
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
      const { status: offerStatus, workflow_status: offerWorkflowStatus } = mapOfferStatus(d.status);

      // ── 3a. Créer l'offer (demande) ─────────────────────────────────────────
      const offerData = {
        company_id:           COMPANY_ID,
        user_id:              USER_ID,
        client_id:            d.client_id || null,
        client_name:          clientName,
        status:               offerStatus,
        workflow_status:      offerWorkflowStatus,
        converted_to_contract: isActive,
        dossier_number:       d.dossier_number,
        request_date:         reqDate,
        created_at:           reqDate,          // ← date réelle du CSV
        updated_at:           reqDate,
        monthly_payment:      monthly ?? 0,
        amount:               financed ?? 0,
        financed_amount:      financed,
        contract_duration:    duration,
        leaser_id:            leaserId,
        billing_entity_id:    billingId,
        business_sector:      d.business_sector || null,
        source:               d.source || null,
        equipment_description: equipDescr || null,
        remarks:              [d.notes, `[${manifest.batch_id}]`].filter(Boolean).join(' | '),
      };

      const offer = await insertOrDry('offers', offerData, d.dossier_number);
      manifest.offers.push(offer.id);
      nOffers++;

      // ── 3b. Lignes d'équipement de l'offer ──────────────────────────────────
      if (d.equipmentLines.length > 0) {
        const equipRows = d.equipmentLines.map(e => ({
          offer_id:       offer.id,
          title:          e.title,
          quantity:       e.qty,
          purchase_price: e.purchase_price ?? 0,
          selling_price:  e.selling_price,
          duration:       duration ?? 48,
          margin:         0,
          order_status:   isActive ? 'received' : 'to_order',
        }));
        const insertedEquip = await insertManyOrDry('offer_equipment', equipRows, d.dossier_number);
        manifest.offer_equipment.push(...insertedEquip.map(r => r.id));
      }

      // ── 3c. Contrat (uniquement pour les dossiers actifs) ────────────────────
      let contractId = null;
      if (isActive) {
        const contractData = {
          company_id:         COMPANY_ID,
          user_id:            USER_ID,
          offer_id:           offer.id,
          client_id:          d.client_id || null,
          client_name:        clientName,
          status:             'active',
          created_at:         startDate || reqDate,   // ← date réelle du CSV
          updated_at:         startDate || reqDate,
          monthly_payment:    monthly ?? 0,
          leaser_name:        d.leaser_name || '',
          leaser_id:          leaserId,
          billing_entity_id:  billingId,
          contract_number:    d.contract_number || null,
          contract_start_date: startDate,
          contract_end_date:  endDate,
          contract_duration:  duration,
          dossier_date:       reqDate,
          equipment_description: equipDescr || null,
          invoice_generated:  !!d.invoice_number,
          invoice_date:       invDate,
          payment_date:       payDate,
          special_provisions: d.notes || null,
        };

        const contract = await insertOrDry('contracts', contractData, d.dossier_number);
        contractId = contract.id;
        manifest.contracts.push(contract.id);
        nContracts++;
      }

      // ── 3d. Facture ──────────────────────────────────────────────────────────
      if (d.invoice_number && d.invoice_number.trim()) {
        const invoiceData = {
          company_id:       COMPANY_ID,
          offer_id:         offer.id,
          contract_id:      contractId,
          invoice_number:   d.invoice_number,
          invoice_date:     invDate,
          created_at:       invDate || reqDate,       // ← date réelle du CSV
          updated_at:       invDate || reqDate,
          invoice_type:     'leasing',
          integration_type: 'manual',
          leaser_name:      d.leaser_name || '',
          amount:           financed ?? 0,
          status:           payDate ? 'paid' : 'draft',
          paid_at:          payDate,
          billing_data:     {
            client_name:    clientName,
            client_id:      d.client_id || null,
            dossier_number: d.dossier_number,
            billing_entity: d.billing_entity_name || null,
          },
        };

        const invoice = await insertOrDry('invoices', invoiceData, d.dossier_number);
        manifest.invoices.push(invoice.id);
        nInvoices++;
      }

      console.log(`  ✅ ${d.dossier_number} | ${(d.client_company||'').padEnd(30)} | ${d.status.padEnd(8)} | ${d.equipmentLines.length} équip.${contractId ? ' + contrat' : ''}${d.invoice_number ? ' + facture' : ''}`);

    } catch (err) {
      nErrors++;
      manifest.errors.push({ dossier: d.dossier_number, error: err.message });
      console.error(`  ❌ ${d.dossier_number} | ERREUR : ${err.message}`);
    }
  }

  // 4. Sauvegarder le manifest
  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n💾 Manifest sauvegardé : ${MANIFEST_PATH}`);
  }

  // 5. Résumé
  console.log('\n' + '━'.repeat(60));
  console.log(`✅  Offres créées    : ${nOffers}`);
  console.log(`✅  Contrats créés   : ${nContracts}`);
  console.log(`✅  Factures créées  : ${nInvoices}`);
  if (nErrors > 0)
    console.log(`❌  Erreurs          : ${nErrors} (voir ${MANIFEST_PATH})`);
  if (DRY_RUN)
    console.log('\nℹ️  DRY-RUN : aucune donnée écrite. Relancer sans --dry-run pour importer.');
  else
    console.log(`\n🔄  Pour annuler : node --input-type=module scripts/import-partial-2023.js rollback`);
}

// ── ROLLBACK ───────────────────────────────────────────────────────────────────
async function doRollback() {
  console.log('\n🔄 ROLLBACK — suppression des enregistrements importés');
  console.log('━'.repeat(60));

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest introuvable : ${MANIFEST_PATH}`);
    console.error('   Aucun import à annuler.');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`  Batch ID  : ${manifest.batch_id}`);
  console.log(`  Créé le   : ${manifest.created_at}`);
  console.log(`  Offers    : ${manifest.offers.length}`);
  console.log(`  Équipements : ${manifest.offer_equipment.length}`);
  console.log(`  Contrats  : ${manifest.contracts.length}`);
  console.log(`  Factures  : ${manifest.invoices.length}`);

  if (manifest.dry_run) {
    console.log('\n⚠️  Cet import était un DRY-RUN, rien à supprimer.');
    return;
  }

  // Suppression dans l'ordre inverse des dépendances FK
  let nDeleted = 0;

  const deleteIds = async (table, ids, label) => {
    if (!ids || !ids.length) return;
    const validIds = ids.filter(Boolean);
    if (!validIds.length) return;
    const { error, count } = await sb.from(table).delete().in('id', validIds);
    if (error) {
      console.error(`  ❌ Erreur suppression ${table} : ${error.message}`);
    } else {
      console.log(`  🗑️  ${table.padEnd(20)} : ${validIds.length} enregistrement(s) supprimé(s)`);
      nDeleted += validIds.length;
    }
  };

  // 1. Factures (référencent contrats + offers)
  await deleteIds('invoices', manifest.invoices, 'invoices');
  // 2. Contrats (référencent offers)
  await deleteIds('contracts', manifest.contracts, 'contracts');
  // 3. Équipements offers (référencent offers)
  await deleteIds('offer_equipment', manifest.offer_equipment, 'offer_equipment');
  // 4. Offers (racine)
  await deleteIds('offers', manifest.offers, 'offers');

  console.log(`\n✅ Rollback terminé — ${nDeleted} enregistrement(s) supprimé(s)`);

  // Renommer le manifest pour éviter un double rollback
  const archivePath = MANIFEST_PATH.replace('.json', `.rolled-back-${Date.now()}.json`);
  writeFileSync(archivePath, readFileSync(MANIFEST_PATH));
  writeFileSync(MANIFEST_PATH, JSON.stringify({ ...manifest, rolled_back_at: new Date().toISOString() }, null, 2));
  console.log(`📁 Manifest archivé : ${archivePath}`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
