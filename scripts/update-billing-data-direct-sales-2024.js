/**
 * update-billing-data-direct-sales-2024.js
 *
 * Met à jour billing_data.equipment_data + invoice_totals pour les 50 ventes
 * directes 2024 (non-Grenke) à partir des données extraites des PDFs.
 *
 * Structure billing_data conservée : client_data, offer_data déjà en place.
 * On ajoute/remplace : equipment_data + invoice_totals.
 *
 * Usage :
 *   node scripts/update-billing-data-direct-sales-2024.js          → dry-run
 *   node scripts/update-billing-data-direct-sales-2024.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync }  from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY    = process.argv.includes('--apply');
const sb       = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const JSON_PATH = join(__dirname, 'direct-sales-equipment-2024.json');

const PDF_DATA = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));

async function main() {
  console.log(`\n🔧 UPDATE BILLING DATA — VENTES DIRECTES 2024 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Récupérer toutes les factures ventes directes 2024 en DB
  const invoiceNumbers = Object.keys(PDF_DATA);
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, billing_data, offer_id')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', invoiceNumbers);

  if (error) { console.error('❌', error.message); return; }

  // Récupérer clients via offers
  const offerIds = [...new Set(invoices.filter(i => i.offer_id).map(i => i.offer_id))];
  const { data: offers } = await sb
    .from('offers')
    .select('id, client_id')
    .in('id', offerIds);
  const clientIds = [...new Set((offers||[]).filter(o => o.client_id).map(o => o.client_id))];
  const { data: clients } = await sb
    .from('clients')
    .select('id, name, company, email, phone, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
    .in('id', clientIds);

  const offerMap  = Object.fromEntries((offers||[]).map(o => [o.id, o]));
  const clientMap = Object.fromEntries((clients||[]).map(c => [c.id, c]));

  const invoiceMap = Object.fromEntries(invoices.map(i => [i.invoice_number, i]));

  let nUpdated = 0, nSkipped = 0, nError = 0;

  for (const [invoiceNumber, pdfData] of Object.entries(PDF_DATA)) {
    if (pdfData.error) {
      console.log(`  ⚠️  ${invoiceNumber}: extraction error — ${pdfData.error}`);
      nError++;
      continue;
    }

    const inv = invoiceMap[invoiceNumber];
    if (!inv) {
      console.log(`  ⚠️  ${invoiceNumber}: not found in DB`);
      nSkipped++;
      continue;
    }

    const equipmentData = pdfData.equipment_data;
    if (!equipmentData?.length) {
      console.log(`  ⚠️  ${invoiceNumber}: no equipment extracted from PDF`);
      nSkipped++;
      continue;
    }

    // Build client_data from DB if not already in billing_data
    const existingBd = inv.billing_data || {};
    let clientData = existingBd.client_data || null;
    if (!clientData || !clientData.name) {
      const offer  = inv.offer_id ? offerMap[inv.offer_id] : null;
      const client = offer?.client_id ? clientMap[offer.client_id] : null;
      if (client) {
        clientData = {
          id:           client.id,
          name:         client.name,
          company:      client.company || '',
          email:        client.email   || '',
          phone:        client.phone   || '',
          vat_number:   client.vat_number || '',
          address:      client.billing_address || '',
          city:         client.billing_city || '',
          postal_code:  client.billing_postal_code || '',
          country:      client.billing_country || 'Belgique',
        };
      }
    }

    const newBd = {
      ...existingBd,
      client_data:    clientData || existingBd.client_data || { name: pdfData.client_ref || '' },
      equipment_data: equipmentData,
      invoice_totals: pdfData.invoice_totals,
    };

    const items = equipmentData.map(e => `${e.title} x${e.quantity}`).join(', ');
    console.log(`  ${APPLY ? '✅' : '🔄'} ${invoiceNumber} — ${equipmentData.length} item(s): ${items.slice(0, 80)}`);

    if (APPLY) {
      const { error: upErr } = await sb
        .from('invoices')
        .update({ billing_data: newBd, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      if (upErr) {
        console.log(`       ❌ ${upErr.message}`);
        nError++;
        continue;
      }
    }
    nUpdated++;
  }

  console.log(`\n══ RÉSUMÉ ══`);
  console.log(`  ${APPLY ? 'Mis à jour' : 'À mettre à jour'} : ${nUpdated}`);
  console.log(`  Ignorés (no data) : ${nSkipped}`);
  console.log(`  Erreurs           : ${nError}`);
  if (!APPLY && nUpdated > 0) console.log(`\n  → Relance avec --apply pour appliquer\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
