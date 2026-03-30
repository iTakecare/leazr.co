/**
 * patch-direct-sales.js
 *
 * Corrige les 21 ventes directes importées :
 *  1. offer.status           : 'pending' → 'accepted'
 *  2. offer.converted_to_contract : false → true
 *  3. offer.margin           : recalculé depuis offer_equipment
 *  4. invoice.billing_data   : ajoute client_name + client_id
 *  5. invoice.paid_at        : mis à invoice_date (factures payées)
 *
 * Usage :
 *   node scripts/patch-direct-sales.js --dry-run
 *   node scripts/patch-direct-sales.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const MANIFEST_PATH        = join(__dirname, 'import-manifest-direct-sales-2023.json');
const DRY_RUN              = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN\n');
  else console.log('\n🔧 PATCH VENTES DIRECTES 2023\n');

  // Load manifest to get the exact offer + invoice IDs we created
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const offerIds   = manifest.offers;
  const invoiceIds = manifest.invoices;

  console.log(`📋 ${offerIds.length} offres | ${invoiceIds.length} factures à corriger\n`);

  // ── 1. Fetch all imported invoices (for billing_data patch) ───────────────
  const { data: invoices, error: ie } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, billing_data, offer_id')
    .in('id', invoiceIds);

  if (ie) throw new Error('Invoices fetch: ' + ie.message);

  // ── 2. For each invoice → fetch linked offer → fetch client ───────────────
  let fixed = 0, errors = 0;

  for (const inv of invoices) {
    // Fetch offer with client info
    const { data: offer, error: oe } = await sb
      .from('offers')
      .select('id, client_id, client_name, amount')
      .eq('id', inv.offer_id)
      .single();

    if (oe || !offer) {
      console.log(`  ❌ ${inv.invoice_number}: offer introuvable`);
      errors++;
      continue;
    }

    // Fetch offer_equipment to calculate real margin
    const { data: eqs } = await sb
      .from('offer_equipment')
      .select('selling_price, purchase_price, quantity')
      .eq('offer_id', offer.id);

    let totalSelling = 0, totalPurchase = 0;
    for (const eq of (eqs || [])) {
      const qty = eq.quantity || 1;
      totalSelling  += (eq.selling_price  || 0) * qty;
      totalPurchase += (eq.purchase_price || 0) * qty;
    }
    const marginAmt = totalSelling - totalPurchase;
    const marginPct = totalSelling > 0
      ? Math.round((marginAmt / totalSelling) * 100)
      : 0;

    // Fetch client details (name, company)
    let clientName = offer.client_name || null;
    let clientId   = offer.client_id   || null;
    if (clientId) {
      const { data: client } = await sb
        .from('clients')
        .select('name, company')
        .eq('id', clientId)
        .single();
      if (client) clientName = client.company || client.name;
    }

    console.log(`  📄 ${inv.invoice_number} → client: "${clientName}" | marge: ${marginAmt.toFixed(2)}€ (${marginPct}%)`);

    if (DRY_RUN) { fixed++; continue; }

    // ── Patch offer ────────────────────────────────────────────────────────
    const { error: offerPatchErr } = await sb
      .from('offers')
      .update({
        status:                 'accepted',
        converted_to_contract:  true,
        margin:                 marginPct,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', offer.id);

    if (offerPatchErr) {
      console.log(`    ❌ Offer patch: ${offerPatchErr.message}`);
      errors++;
      continue;
    }

    // ── Patch invoice billing_data ─────────────────────────────────────────
    const newBillingData = {
      ...(inv.billing_data || {}),
      client_id:   clientId,
      client_name: clientName,
      invoice_totals: {
        vat_rate:       0.21,
        vat_amount:     Math.round(totalSelling * 0.21 * 100) / 100,
        total_excl_vat: totalSelling,
        total_incl_vat: Math.round(totalSelling * 1.21 * 100) / 100,
      }
    };

    const { error: invPatchErr } = await sb
      .from('invoices')
      .update({
        billing_data: newBillingData,
        paid_at:      inv.invoice_date ? new Date(inv.invoice_date).toISOString() : null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', inv.id);

    if (invPatchErr) {
      console.log(`    ❌ Invoice patch: ${invPatchErr.message}`);
      errors++;
      continue;
    }

    console.log(`    ✅ Patché`);
    fixed++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  ✅ Corrigées : ${fixed}`);
  console.log(`  ❌ Erreurs   : ${errors}`);
  if (DRY_RUN) console.log('\n  (dry-run : aucune modification effectuée)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
