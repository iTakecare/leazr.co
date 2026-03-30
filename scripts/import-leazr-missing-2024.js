/**
 * import-leazr-missing-2024.js
 *
 * Importe les 8 dossiers du CSV 2024 qui ont été exclus par le filtre de date :
 *   - 5 avec request_date en 2023 mais invoice_date en 2024
 *   - 3 avec "aout 2024" (format non parsable par l'import standard)
 *
 * Exclut intentionnellement :
 *   - 180-19681 JNS Lightning  (req=aout 2023, inv=aout 2023 → pas 2024)
 *   - 180-19866 Infra Route #3 (req=09/2023,   inv=09/2023  → pas 2024)
 *
 * Usage :
 *   node scripts/import-leazr-missing-2024.js --dry-run
 *   node scripts/import-leazr-missing-2024.js
 *   node scripts/import-leazr-missing-2024.js rollback
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const ADMIN_EMAIL          = 'hello@itakecare.be';
const CSV_PATH             = '/Users/itakecare/Desktop/iTakecare/Clients/import-leazr-2024.csv';
const MANIFEST_PATH        = join(__dirname, 'import-manifest-missing-2024.json');

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ROLLBACK = args.includes('rollback');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Dossiers à importer (exclus par filtre standard)
const TARGET_DOSSIERS = new Set([
  '180-21116', '180-21194',                              // req 12/2023, inv 01/2024
  '180-20363', '180-20348', '180-20361',                 // req 09/2023, inv 02/2024
  '180-24109', '180-24297', '180-24394',                 // "aout 2024" format
]);

function parseDate(d) {
  if (!d || !d.trim()) return null;
  // Handle "aout 2024" → "2024-08-01"
  const monthNames = { 'jan': '01','fév': '02','mar': '03','avr': '04','mai': '05','juin': '06',
    'juil': '07','juil.': '07','aout': '08','août': '08','sep': '09','oct': '10','nov': '11','déc': '12' };
  for (const [fr, num] of Object.entries(monthNames)) {
    if (d.toLowerCase().includes(fr)) {
      const yearMatch = d.match(/\d{4}/);
      if (yearMatch) return `${yearMatch[0]}-${num}-01`;
    }
  }
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

function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(';');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const result = []; let current = '', inq = false;
    for (const ch of line) {
      if (ch === '"') { if (inq && line[line.indexOf(ch)+1]==='"') { current+='"'; } else inq=!inq; }
      else if (ch === ';' && !inq) { result.push(current.trim()); current = ''; }
      else current += ch;
    }
    result.push(current.trim());
    const obj = {};
    headers.forEach((h, j) => obj[h] = (result[j] ?? '').trim());
    return obj;
  });
}

function groupByDossier(rows) {
  const dossiers = []; let current = null;
  for (const row of rows) {
    if (row.dossier_number) { current = { ...row, equipmentLines: [] }; dossiers.push(current); }
    if (current && row.equipment_title) {
      current.equipmentLines.push({
        title: row.equipment_title, qty: parseInt(row.equipment_qty, 10) || 1,
        purchase_price: parseAmount(row.equipment_price), selling_price: parseAmount(row.equipment_selling_price),
      });
    }
  }
  return dossiers;
}

function mapOfferStatus(csvStatus) {
  switch ((csvStatus || '').toLowerCase()) {
    case 'active':   return { status: 'accepted', workflow_status: 'financed' };
    case 'pending':  return { status: 'sent',     workflow_status: 'leaser_review' };
    default:         return { status: 'draft',    workflow_status: 'draft' };
  }
}

// ── Rollback ───────────────────────────────────────────────────────────────────
async function doRollback() {
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const del = async (table, ids) => {
    if (!ids?.length) return;
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) console.error(`  ❌ ${table}: ${error.message}`);
    else console.log(`  🗑️  ${table}: ${ids.length} supprimés`);
  };
  await del('invoices', m.invoices);
  await del('contract_equipment', m.contract_equipment);
  await del('contracts', m.contracts);
  await del('offer_equipment', m.offer_equipment);
  await del('offers', m.offers);
  console.log('✅ Rollback terminé');
  process.exit(0);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (ROLLBACK) { await doRollback(); return; }

  console.log(`\n🚀 IMPORT DOSSIERS MANQUANTS 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);

  // Get user_id
  const { data: userData } = await sb.from('profiles').select('id').eq('email', ADMIN_EMAIL).single();
  const USER_ID = userData?.id;

  // Get leasers
  const { data: leasers } = await sb.from('leasers').select('id, name').eq('company_id', COMPANY_ID);
  const leaserByName = {};
  for (const l of leasers || []) leaserByName[l.name.toLowerCase()] = l.id;

  // Parse CSV and filter to target dossiers
  const allDossiers = groupByDossier(parseCSV(readFileSync(CSV_PATH, 'utf-8')));
  const dossiers = allDossiers.filter(d => TARGET_DOSSIERS.has(d.dossier_number));
  console.log(`\n📋 ${dossiers.length} dossiers à importer\n`);

  // Check already imported
  const { data: existingOffers } = await sb
    .from('offers')
    .select('dossier_number')
    .in('dossier_number', [...TARGET_DOSSIERS])
    .eq('company_id', COMPANY_ID);
  const alreadyImported = new Set((existingOffers || []).map(o => o.dossier_number));

  const manifest = {
    batch_id: `import-missing-2024-${new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)}`,
    created_at: new Date().toISOString(),
    offers: [], offer_equipment: [], contracts: [], contract_equipment: [], invoices: [], errors: []
  };

  let nOffers = 0, nContracts = 0, nInvoices = 0, totalFA = 0;

  for (const d of dossiers) {
    if (alreadyImported.has(d.dossier_number)) {
      console.log(`  ⏭️  ${d.dossier_number} déjà importé — skip`);
      continue;
    }

    const clientName  = d.client_name || d.client_company || '';
    const leaserId    = leaserByName[(d.leaser_name||'').toLowerCase()] || null;
    const reqDate     = parseDate(d.request_date);
    const invDate     = parseDate(d.invoice_date);
    const payDate     = parseDate(d.payment_date);
    const startDate   = parseDate(d.contract_start_date);
    const endDate     = parseDate(d.contract_end_date);
    const duration    = parseInt(d.contract_duration, 10) || null;
    const financed    = parseAmount(d.financed_amount);
    const monthly     = parseAmount(d.monthly_payment);
    const isActive    = d.status === 'active';
    const equipDescr  = d.equipmentLines.map(e => `${e.qty}x ${e.title}`).join(' | ');
    const { status: offerStatus, workflow_status: wfStatus } = mapOfferStatus(d.status);

    console.log(`  📋 ${d.dossier_number} | ${clientName} | FA=${financed}€ | inv=${invDate}`);

    try {
      if (DRY_RUN) { nOffers++; if (isActive) nContracts++; if (d.invoice_number) nInvoices++; totalFA += financed||0; continue; }

      // 1. Offer
      const { data: offer, error: offerErr } = await sb.from('offers').insert({
        company_id: COMPANY_ID, user_id: USER_ID,
        client_name: clientName, status: offerStatus, workflow_status: wfStatus,
        converted_to_contract: isActive, dossier_number: d.dossier_number,
        request_date: reqDate, created_at: reqDate || invDate, updated_at: reqDate || invDate,
        monthly_payment: monthly ?? 0, amount: financed ?? 0, financed_amount: financed,
        contract_duration: duration, leaser_id: leaserId,
        equipment_description: equipDescr || null,
        remarks: `[import-missing-2024] ${d.dossier_number}`,
      }).select('id').single();
      if (offerErr) throw new Error(`Offer: ${offerErr.message}`);
      manifest.offers.push(offer.id);
      nOffers++;

      // 2. Equipment
      if (d.equipmentLines.length > 0) {
        const { data: eqRows, error: eqErr } = await sb.from('offer_equipment').insert(
          d.equipmentLines.map(e => ({
            offer_id: offer.id, title: e.title, quantity: e.qty,
            purchase_price: e.purchase_price ?? 0, selling_price: e.selling_price,
            duration: duration ?? 48, margin: 0, order_status: isActive ? 'received' : 'to_order',
          }))
        ).select('id');
        if (eqErr) throw new Error(`Equipment: ${eqErr.message}`);
        manifest.offer_equipment.push(...(eqRows||[]).map(r => r.id));
      }

      // 3. Contract
      let contractId = null;
      if (isActive) {
        const { data: contract, error: cErr } = await sb.from('contracts').insert({
          company_id: COMPANY_ID, user_id: USER_ID, offer_id: offer.id,
          client_name: clientName, status: 'active',
          created_at: startDate || reqDate || invDate, updated_at: startDate || reqDate || invDate,
          monthly_payment: monthly ?? 0, leaser_name: d.leaser_name || '', leaser_id: leaserId,
          contract_number: d.contract_number || null,
          contract_start_date: startDate, contract_end_date: endDate, contract_duration: duration,
          dossier_date: reqDate, equipment_description: equipDescr || null,
          invoice_generated: !!d.invoice_number, invoice_date: invDate, payment_date: payDate,
        }).select('id').single();
        if (cErr) throw new Error(`Contract: ${cErr.message}`);
        contractId = contract.id;
        manifest.contracts.push(contract.id);
        nContracts++;

        // 3b. contract_equipment (pour Achats dans le dashboard)
        if (d.equipmentLines.length > 0) {
          const { data: ceRows, error: ceErr } = await sb.from('contract_equipment').insert(
            d.equipmentLines.map(e => ({
              contract_id: contractId, title: e.title, quantity: e.qty,
              purchase_price: e.purchase_price ?? 0, margin: 0, monthly_payment: 0,
            }))
          ).select('id');
          if (ceErr) console.error(`  ⚠️  contract_equipment: ${ceErr.message}`);
          else manifest.contract_equipment.push(...(ceRows||[]).map(r => r.id));
        }
      }

      // 4. Invoice
      if (d.invoice_number?.trim()) {
        const { data: invoice, error: invErr } = await sb.from('invoices').insert({
          company_id: COMPANY_ID, offer_id: offer.id, contract_id: contractId,
          invoice_number: d.invoice_number, invoice_date: invDate,
          created_at: invDate || reqDate, updated_at: invDate || reqDate,
          invoice_type: 'leasing', integration_type: 'manual',
          leaser_name: d.leaser_name || '', amount: financed ?? 0,
          status: payDate ? 'paid' : 'draft', paid_at: payDate,
          billing_data: {
            contract_data: {
              client_name:    clientName,
              client_company: d.client_company || clientName,
              dossier_number: d.dossier_number,
              leaser_name:    d.leaser_name || '',
            },
            client_name:    clientName,
            dossier_number: d.dossier_number,
          },
        }).select('id').single();
        if (invErr) throw new Error(`Invoice: ${invErr.message}`);
        manifest.invoices.push(invoice.id);
        nInvoices++;
        totalFA += financed || 0;
      }

      console.log(`    ✅ Importé: offer + ${isActive ? 'contrat + ' : ''}facture`);

    } catch (err) {
      console.error(`    ❌ ${d.dossier_number}: ${err.message}`);
      manifest.errors.push({ dossier: d.dossier_number, error: err.message });
    }
  }

  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n💾 Manifest: ${MANIFEST_PATH}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  Offres    : ${nOffers}`);
  console.log(`  Contrats  : ${nContracts}`);
  console.log(`  Factures  : ${nInvoices}`);
  console.log(`  Total FA  : ${totalFA.toFixed(2)}€  (attendu: ~75,819.22€)`);
  if (DRY_RUN) console.log('\n  (dry-run — aucune modification)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
