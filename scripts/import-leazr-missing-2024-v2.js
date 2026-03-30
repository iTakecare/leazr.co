/**
 * import-leazr-missing-2024-v2.js
 *
 * Importe les 5 dossiers leasing encore manquants en DB :
 *   - ITC-2024-0073  Choukri Skhiri / Prepalux      (180-23681) inv=aout 2024
 *   - ITC-2024-0074  Julien Bombeke / Ropal Sécurité (180-23894) inv=aout 2024
 *   - ITC-2024-0081  Antoine Sottiaux / LeGrow #2    (180-23893) inv=aout 2024
 *   - ITC-2024-0104  Davy Loomans / JNS Lightning    (180-19681) req=aout 2023 → inv=01/10/2024
 *   - ITC-2024-0109  Gregory Ilnicki / Infra Route #3 (180-19866) req=01/09/2023 → inv=01/11/2024
 *
 * Logique "upsert": vérifie si offer/contrat existe déjà par dossier_number.
 *   - Si oui: réutilise l'offer existant, crée seulement invoice + contract_equipment si manquants
 *   - Si non: crée offer + contract + invoice
 *
 * Usage :
 *   node scripts/import-leazr-missing-2024-v2.js --dry-run
 *   node scripts/import-leazr-missing-2024-v2.js
 *   node scripts/import-leazr-missing-2024-v2.js rollback
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
const MANIFEST_PATH        = join(__dirname, 'import-manifest-missing-2024-v2.json');

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ROLLBACK = args.includes('rollback');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Dossiers cibles (5 encore manquants après v1)
const TARGET_DOSSIERS = new Set([
  '180-23681',  // ITC-2024-0073  Choukri Skhiri / Prepalux
  '180-23894',  // ITC-2024-0074  Julien Bombeke / Ropal Sécurité
  '180-23893',  // ITC-2024-0081  Antoine Sottiaux / LeGrow #2
  '180-19681',  // ITC-2024-0104  Davy Loomans / JNS Lightning
  '180-19866',  // ITC-2024-0109  Gregory Ilnicki / Infra Route #3
]);

// Montants de marge (purchase_price - ce qu'on a dans le CSV)
// Format: dossier_number → purchase_price total
const EXPECTED_FA = {
  '180-23681': 4387.67,
  '180-23894': 731.87,
  '180-23893': 1756.87,
  '180-19681': 2498.63,
  '180-19866': 1185.99,
};

function parseDate(d) {
  if (!d || !d.trim()) return null;
  const monthNames = {
    'jan': '01', 'fév': '02', 'feb': '02', 'mar': '03', 'avr': '04', 'apr': '04',
    'mai': '05', 'may': '05', 'juin': '06', 'jun': '06',
    'juil': '07', 'jul': '07', 'aout': '08', 'août': '08', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'déc': '12', 'dec': '12',
  };
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
      if (ch === '"') { inq = !inq; }
      else if (ch === ';' && !inq) { result.push(current.trim()); current = ''; }
      else current += ch;
    }
    result.push(current.trim());
    const obj = {};
    headers.forEach((h, j) => obj[h.trim()] = (result[j] ?? '').trim());
    return obj;
  });
}

function groupByDossier(rows) {
  const dossiers = []; let current = null;
  for (const row of rows) {
    if (row.dossier_number) {
      current = { ...row, equipmentLines: [] };
      dossiers.push(current);
    }
    if (current && row.equipment_title) {
      current.equipmentLines.push({
        title: row.equipment_title,
        qty: parseInt(row.equipment_qty, 10) || 1,
        purchase_price: parseAmount(row.equipment_price),
        selling_price:  parseAmount(row.equipment_selling_price),
      });
    }
  }
  return dossiers;
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

  console.log(`\n🚀 IMPORT DOSSIERS MANQUANTS 2024 v2 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);

  const { data: userData } = await sb.from('profiles').select('id').eq('email', ADMIN_EMAIL).single();
  const USER_ID = userData?.id;

  const { data: leasers } = await sb.from('leasers').select('id, name').eq('company_id', COMPANY_ID);
  const leaserByName = {};
  for (const l of leasers || []) leaserByName[l.name.toLowerCase()] = l.id;

  // Parse CSV and filter target dossiers
  const allDossiers = groupByDossier(parseCSV(readFileSync(CSV_PATH, 'utf-8')));
  const dossiers    = allDossiers.filter(d => TARGET_DOSSIERS.has(d.dossier_number));
  console.log(`\n📋 ${dossiers.length} dossiers trouvés dans le CSV\n`);

  // Check existing offers in DB (for upsert logic)
  const { data: existingOffersInDB } = await sb
    .from('offers')
    .select('id, dossier_number')
    .in('dossier_number', [...TARGET_DOSSIERS])
    .eq('company_id', COMPANY_ID);
  const existingOfferMap = new Map((existingOffersInDB || []).map(o => [o.dossier_number, o.id]));

  // Check existing invoices in DB
  const targetInvoiceNumbers = dossiers.map(d => d.invoice_number).filter(Boolean);
  const { data: existingInvoicesInDB } = await sb
    .from('invoices')
    .select('invoice_number')
    .in('invoice_number', targetInvoiceNumbers)
    .eq('company_id', COMPANY_ID);
  const existingInvoiceNums = new Set((existingInvoicesInDB || []).map(i => i.invoice_number));

  const manifest = {
    batch_id: `import-missing-2024-v2-${new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)}`,
    created_at: new Date().toISOString(),
    offers: [], offer_equipment: [], contracts: [], contract_equipment: [], invoices: [], errors: []
  };

  let nOffers = 0, nContracts = 0, nInvoices = 0, totalFA = 0;

  for (const d of dossiers) {
    const clientName   = d.client_name || d.client_company || '';
    const leaserId     = leaserByName[(d.leaser_name||'').toLowerCase()] || null;
    const reqDate      = parseDate(d.request_date);
    const startDate    = parseDate(d.contract_start_date);
    const payDate      = parseDate(d.payment_date);
    const duration     = parseInt(d.contract_duration, 10) || 48;
    const financed     = parseAmount(d.financed_amount) || EXPECTED_FA[d.dossier_number];
    const monthly      = parseAmount(d.monthly_payment);
    const equipDescr   = d.equipmentLines.map(e => `${e.qty}x ${e.title}`).join(' | ');

    // Pour 180-19681 (JNS) et 180-19866 (Infra Route): invoice_date est en 2023 dans le CSV
    // → utiliser contract_start_date (01/10/2024 et 01/11/2024 respectivement)
    let rawInvDate = parseDate(d.invoice_date);
    if (!rawInvDate || rawInvDate < '2024-01-01') {
      rawInvDate = startDate;  // fallback sur contract_start_date
    }
    const invDate = rawInvDate;

    // Tous ces dossiers ont une facture dans la référence → on les traite comme actifs
    const offerStatus = 'accepted';
    const wfStatus    = 'financed';
    const isActive    = true;

    console.log(`  📋 ${d.dossier_number} | ${clientName} | FA=${financed}€ | inv=${invDate}`);

    const offerAlreadyExists   = existingOfferMap.has(d.dossier_number);
    const invoiceAlreadyExists = existingInvoiceNums.has(d.invoice_number);

    if (invoiceAlreadyExists) {
      console.log(`    ⏭️  Facture ${d.invoice_number} déjà en DB — skip`);
      continue;
    }

    if (DRY_RUN) {
      if (!offerAlreadyExists) nOffers++;
      nContracts++;
      nInvoices++;
      totalFA += financed || 0;
      continue;
    }

    try {
      let offerId = existingOfferMap.get(d.dossier_number) || null;

      // 1. Offer (si pas déjà en DB)
      if (!offerAlreadyExists) {
        const { data: offer, error: offerErr } = await sb.from('offers').insert({
          company_id: COMPANY_ID, user_id: USER_ID,
          client_name: clientName, status: offerStatus, workflow_status: wfStatus,
          converted_to_contract: true, dossier_number: d.dossier_number,
          request_date: reqDate, created_at: invDate || reqDate, updated_at: invDate || reqDate,
          monthly_payment: monthly ?? 0, amount: financed ?? 0, financed_amount: financed,
          contract_duration: duration, leaser_id: leaserId,
          equipment_description: equipDescr || null,
          remarks: `[import-missing-2024-v2] ${d.dossier_number}`,
        }).select('id').single();
        if (offerErr) throw new Error(`Offer: ${offerErr.message}`);
        offerId = offer.id;
        manifest.offers.push(offer.id);
        nOffers++;

        // 2. offer_equipment
        if (d.equipmentLines.length > 0) {
          const { data: eqRows, error: eqErr } = await sb.from('offer_equipment').insert(
            d.equipmentLines.map(e => ({
              offer_id: offerId, title: e.title, quantity: e.qty,
              purchase_price: e.purchase_price ?? 0, selling_price: e.selling_price,
              duration: duration, margin: 0, order_status: 'received',
            }))
          ).select('id');
          if (eqErr) console.warn(`  ⚠️  offer_equipment: ${eqErr.message}`);
          else manifest.offer_equipment.push(...(eqRows||[]).map(r => r.id));
        }
      } else {
        console.log(`    ℹ️  Offer ${d.dossier_number} déjà en DB (id=${offerId}) — réutilisé`);
      }

      // 3. Contract (toujours créer si manquant, pour avoir contract_equipment)
      const { data: existingContracts } = await sb
        .from('contracts')
        .select('id')
        .eq('offer_id', offerId)
        .eq('company_id', COMPANY_ID);

      let contractId = existingContracts?.[0]?.id || null;

      if (!contractId) {
        const { data: contract, error: cErr } = await sb.from('contracts').insert({
          company_id: COMPANY_ID, user_id: USER_ID, offer_id: offerId,
          client_name: clientName, status: 'active',
          created_at: invDate, updated_at: invDate,
          monthly_payment: monthly ?? 0, leaser_name: d.leaser_name || '', leaser_id: leaserId,
          contract_number: d.contract_number || null,
          contract_start_date: startDate || invDate,
          contract_duration: duration,
          dossier_date: invDate,
          equipment_description: equipDescr || null,
          invoice_generated: true, invoice_date: invDate, payment_date: payDate,
        }).select('id').single();
        if (cErr) throw new Error(`Contract: ${cErr.message}`);
        contractId = contract.id;
        manifest.contracts.push(contract.id);
        nContracts++;

        // 3b. contract_equipment (pour Achats/Marge dans le dashboard)
        if (d.equipmentLines.length > 0) {
          const { data: ceRows, error: ceErr } = await sb.from('contract_equipment').insert(
            d.equipmentLines.map(e => ({
              contract_id: contractId, title: e.title, quantity: e.qty,
              purchase_price: e.purchase_price ?? 0,
              margin: (e.selling_price ?? 0) - (e.purchase_price ?? 0),
              monthly_payment: monthly ?? 0,
            }))
          ).select('id');
          if (ceErr) console.warn(`  ⚠️  contract_equipment: ${ceErr.message}`);
          else manifest.contract_equipment.push(...(ceRows||[]).map(r => r.id));
        }
      } else {
        console.log(`    ℹ️  Contrat pour ${d.dossier_number} déjà en DB — réutilisé`);
        nContracts++;
      }

      // 4. Invoice
      if (d.invoice_number?.trim()) {
        const { data: invoice, error: invErr } = await sb.from('invoices').insert({
          company_id: COMPANY_ID, offer_id: offerId, contract_id: contractId,
          invoice_number: d.invoice_number, invoice_date: invDate,
          created_at: invDate, updated_at: invDate,
          invoice_type: 'leasing', integration_type: 'manual',
          leaser_name: d.leaser_name || '', amount: financed ?? 0,
          status: 'paid', paid_at: invDate,
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

      console.log(`    ✅ Importé: ${!offerAlreadyExists ? 'offer + ' : ''}contrat + facture`);

    } catch (err) {
      console.error(`    ❌ ${d.dossier_number}: ${err.message}`);
      manifest.errors.push({ dossier: d.dossier_number, error: err.message });
    }
  }

  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n💾 Manifest: ${MANIFEST_PATH}`);
  }

  const expectedFA = Object.values(EXPECTED_FA).reduce((s, v) => s + v, 0);
  console.log('\n' + '═'.repeat(60));
  console.log(`  Offres créées    : ${nOffers}`);
  console.log(`  Contrats créés   : ${nContracts}`);
  console.log(`  Factures créées  : ${nInvoices}`);
  console.log(`  Total FA importé : ${totalFA.toFixed(2)}€  (attendu: ~${expectedFA.toFixed(2)}€)`);
  if (DRY_RUN) console.log('\n  (dry-run — aucune modification)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
