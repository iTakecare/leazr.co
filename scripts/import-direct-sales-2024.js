/**
 * import-direct-sales-2024.js
 *
 * Importe les 50 factures de vente directe 2024 dans Leazr.
 *
 * Pour chaque facture :
 *   1. Cherche le client par TVA, puis par nom (fuzzy match)
 *   2. Crée une offre (is_purchase=true, workflow_status='invoicing', status='accepted')
 *   3. Crée les lignes d'équipement (offer_equipment)
 *   4. Crée la facture (invoice_type='purchase') avec billing_data correct
 *   5. paid_at = invoice_date (factures payées)
 *
 * ⚠️ À exécuter depuis le Mac (pas la VM) :
 *   node scripts/import-direct-sales-2024.js --dry-run   ← vérification
 *   node scripts/import-direct-sales-2024.js             ← import réel
 *   node scripts/import-direct-sales-2024.js rollback    ← annuler
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const MANIFEST_PATH        = join(__dirname, 'import-manifest-direct-sales-2024.json');
const DATA_PATH            = join(__dirname, 'direct-sales-invoices-2024.json');

const args    = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ROLLBACK = args.includes('rollback');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const INVOICES_DATA = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));

// ── Client matching helpers ────────────────────────────────────────────────────
function normalizeStr(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a, b) {
  const ta = new Set(normalizeStr(a).split(' ').filter(w => w.length > 2));
  const tb = new Set(normalizeStr(b).split(' ').filter(w => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  const common = [...ta].filter(x => tb.has(x));
  return common.length / Math.max(ta.size, tb.size);
}

function findBestClient(ref, clients) {
  let best = null, bestScore = 0;
  for (const c of clients) {
    const score = Math.max(
      tokenOverlap(ref, c.company || ''),
      tokenOverlap(ref, c.name || ''),
      tokenOverlap(ref, `${c.name} ${c.company}`)
    );
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 0.55 ? { client: best, score: bestScore } : null;
}

// ── Rollback ───────────────────────────────────────────────────────────────────
async function doRollback() {
  console.log('\n🔄 ROLLBACK import-direct-sales-2024');
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

  const del = async (table, ids) => {
    if (!ids || ids.length === 0) return;
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) console.error(`  ❌ Erreur delete ${table}: ${error.message}`);
    else console.log(`  🗑️  ${table}: ${ids.length} supprimés`);
  };

  await del('invoices', manifest.invoices);
  await del('offer_equipment', manifest.offer_equipment);
  await del('offers', manifest.offers);
  console.log('✅ Rollback terminé');
  process.exit(0);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (ROLLBACK) { await doRollback(); return; }

  console.log(`\n🛒 IMPORT VENTES DIRECTES 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);
  console.log(`📋 ${INVOICES_DATA.length} factures à traiter\n`);

  // Load all clients for this company
  const { data: allClients, error: clientErr } = await sb
    .from('clients')
    .select('id, name, company, email, phone, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
    .eq('company_id', COMPANY_ID);

  if (clientErr) { console.error('❌ Erreur clients:', clientErr.message); process.exit(1); }
  console.log(`📦 ${allClients.length} clients chargés depuis DB\n`);

  // Build a VAT → client map for fast lookup
  const vatMap = new Map();
  for (const c of allClients) {
    if (c.vat_number) vatMap.set(c.vat_number.replace(/\s/g, '').toUpperCase(), c);
  }

  // Check which invoice_numbers already exist in DB (avoid duplicates)
  const allInvoiceNums = INVOICES_DATA.map(d => d.invoice_number).filter(Boolean);
  const { data: existingInvoices } = await sb
    .from('invoices')
    .select('invoice_number')
    .in('invoice_number', allInvoiceNums);
  const existingNums = new Set((existingInvoices || []).map(i => i.invoice_number));
  if (existingNums.size > 0) console.log(`  ⚠️  Factures déjà en DB: ${existingNums.size}\n`);

  const manifest = {
    batch_id: `import-direct-2024-${new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)}`,
    created_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    offers: [], offer_equipment: [], invoices: [], errors: []
  };

  let imported = 0, skipped = 0, errors = 0;

  // Totals for verification
  let totalPV = 0, totalPA = 0;

  for (const inv of INVOICES_DATA) {
    const { invoice_number, invoice_date, client_ref, client_vat, total_htva, purchase_price, tva_rate, equipment, client_override } = inv;

    // Skip if already exists
    if (existingNums.has(invoice_number)) {
      console.log(`  ⏭️  ${invoice_number} déjà en DB — skip`);
      skipped++;
      continue;
    }

    // ── Find client ─────────────────────────────────────────────────────────
    let clientRecord = null;

    // 1. Try VAT lookup first
    if (client_vat) {
      const vatKey = client_vat.replace(/\s/g, '').toUpperCase();
      clientRecord = vatMap.get(vatKey) || null;
      if (clientRecord) {
        console.log(`  🔑 ${invoice_number} → VAT match: "${clientRecord.company || clientRecord.name}"`);
      }
    }

    // 2. Try client_override name match
    if (!clientRecord && client_override) {
      const match = findBestClient(client_override, allClients);
      if (match) {
        clientRecord = match.client;
        console.log(`  🔍 ${invoice_number} → override match: "${clientRecord.company || clientRecord.name}" (score: ${match.score.toFixed(2)})`);
      }
    }

    // 3. Try client_ref name match
    if (!clientRecord) {
      const match = findBestClient(client_ref, allClients);
      if (match) {
        clientRecord = match.client;
        console.log(`  🔍 ${invoice_number} → ref match: "${clientRecord.company || clientRecord.name}" (score: ${match.score.toFixed(2)})`);
      }
    }

    if (!clientRecord) {
      console.log(`  ⚠️  ${invoice_number} → client "${client_override || client_ref}" INTROUVABLE en DB — import sans client_id`);
    }

    const clientId   = clientRecord?.id   || null;
    const clientName = clientRecord
      ? (clientRecord.company || clientRecord.name)
      : (client_override || client_ref);

    // ── Build client_data for billing_data ──────────────────────────────────
    const clientDataObj = clientRecord ? {
      id:          clientRecord.id,
      name:        clientRecord.company || clientRecord.name,
      company:     clientRecord.company,
      email:       clientRecord.email,
      phone:       clientRecord.phone,
      vat_number:  clientRecord.vat_number,
      address:     clientRecord.billing_address,
      city:        clientRecord.billing_city,
      postal_code: clientRecord.billing_postal_code,
      country:     clientRecord.billing_country || 'Belgique',
    } : { name: clientName };

    // ── Equipment lines ─────────────────────────────────────────────────────
    const equipmentLines = equipment && equipment.length > 0
      ? equipment
      : [{
          title: client_override || client_ref || 'Équipement',
          quantity: 1,
          purchase_price: purchase_price || 0,
          selling_price: total_htva,
        }];

    const totalSelling  = equipmentLines.reduce((s, e) => s + ((e.selling_price || 0) * (e.quantity || 1)), 0);
    const totalPurchase = equipmentLines.reduce((s, e) => s + ((e.purchase_price || 0) * (e.quantity || 1)), 0);
    const marginAmt = totalSelling - totalPurchase;
    const marginPct = totalSelling > 0 ? Math.round((marginAmt / totalSelling) * 100) : 0;

    console.log(`  📄 ${invoice_number} | ${invoice_date} | CA: ${total_htva}€ | PA: ${totalPurchase.toFixed(2)}€ | Marge: ${marginAmt.toFixed(2)}€ (${marginPct}%) | client: "${clientName}"`);

    totalPV += total_htva;
    totalPA += totalPurchase;

    if (DRY_RUN) { imported++; continue; }

    try {
      // 1. Create offer
      const { data: offer, error: offerErr } = await sb
        .from('offers')
        .insert({
          company_id:            COMPANY_ID,
          client_id:             clientId,
          client_name:           clientName,
          status:                'accepted',
          workflow_status:       'invoicing',
          converted_to_contract: true,
          is_purchase:           true,
          amount:                total_htva,
          margin:                marginPct,
          monthly_payment:       0,
          remarks:               `[import-direct-2024] Facture ${invoice_number}`,
          created_at:            invoice_date ? new Date(invoice_date).toISOString() : new Date().toISOString(),
          updated_at:            new Date().toISOString(),
        })
        .select('id')
        .single();

      if (offerErr) throw new Error(`Offer insert: ${offerErr.message}`);
      manifest.offers.push(offer.id);

      // 2. Create equipment lines
      for (const item of equipmentLines) {
        const sp  = item.selling_price  || 0;
        const pp  = item.purchase_price || 0;
        const qty = item.quantity || 1;
        const itemMarginPct = sp > 0 ? Math.round(((sp - pp) / sp) * 100) : 0;

        const { data: eq, error: eqErr } = await sb
          .from('offer_equipment')
          .insert({
            offer_id:       offer.id,
            title:          item.title,
            purchase_price: pp,
            selling_price:  sp,
            quantity:       qty,
            margin:         itemMarginPct,
            monthly_payment: 0,
            serial_number:  item.serial_number || null,
            duration:       0,
            order_status:   'delivered',
            created_at:     new Date().toISOString(),
            updated_at:     new Date().toISOString(),
          })
          .select('id')
          .single();

        if (eqErr) throw new Error(`Equipment insert: ${eqErr.message}`);
        manifest.offer_equipment.push(eq.id);
      }

      // 3. Create invoice with correct billing_data structure
      const billingData = {
        // Nested client_data — what InvoicingPage.tsx reads
        client_data: clientDataObj,
        offer_data: {
          is_purchase: true,
          offer_number: invoice_number,
        },
        invoice_totals: {
          vat_rate:       tva_rate || 0.21,
          vat_amount:     Math.round(total_htva * (tva_rate || 0.21) * 100) / 100,
          total_excl_vat: Math.round(total_htva * 100) / 100,
          total_incl_vat: Math.round(total_htva * (1 + (tva_rate || 0.21)) * 100) / 100,
        },
        // Source tracking
        client_ref,
        client_vat:  client_vat || null,
        imported:    true,
        source:      'import-direct-sales-2024',
      };

      const { data: invoice, error: invoiceErr } = await sb
        .from('invoices')
        .insert({
          company_id:       COMPANY_ID,
          offer_id:         offer.id,
          contract_id:      null,
          invoice_type:     'purchase',
          invoice_number:   invoice_number,
          amount:           total_htva,
          status:           'paid',
          leaser_name:      'Direct',
          integration_type: 'direct',
          invoice_date:     invoice_date,
          paid_at:          invoice_date ? new Date(invoice_date).toISOString() : null,
          billing_data:     billingData,
          created_at:       invoice_date ? new Date(invoice_date).toISOString() : new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        })
        .select('id')
        .single();

      if (invoiceErr) throw new Error(`Invoice insert: ${invoiceErr.message}`);
      manifest.invoices.push(invoice.id);

      console.log(`    ✅ Importé: offer=${offer.id.slice(0,8)}... invoice=${invoice.id.slice(0,8)}...`);
      imported++;

    } catch (err) {
      console.error(`    ❌ Erreur pour ${invoice_number}: ${err.message}`);
      manifest.errors.push({ invoice_number, error: err.message });
      errors++;
    }
  }

  // ── Totals verification ──────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 VÉRIFICATION DES TOTAUX :');
  console.log(`   CA Total importé   : ${totalPV.toFixed(2)}€  (référence: 19,214.07€)`);
  console.log(`   PA Total importé   : ${totalPA.toFixed(2)}€  (référence: 15,573.01€)`);
  console.log(`   Marge importée     : ${(totalPV - totalPA).toFixed(2)}€  (référence: 3,641.06€)`);
  const pvOk = Math.abs(totalPV - 19214.07) < 0.05;
  const paOk = Math.abs(totalPA - 15573.01) < 0.05;
  console.log(`   CA  : ${pvOk ? '✅' : '❌ ÉCART'} | PA : ${paOk ? '✅' : '❌ ÉCART'}`);

  // Save manifest
  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n💾 Manifest sauvegardé: ${MANIFEST_PATH}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  ✅ Importées   : ${imported}`);
  console.log(`  ⏭️  Ignorées    : ${skipped}`);
  console.log(`  ❌ Erreurs     : ${errors}`);
  if (DRY_RUN) console.log('\n  (mode dry-run : aucune modification effectuée)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
