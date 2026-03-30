/**
 * patch-direct-sales-v2.js
 *
 * Corrige toutes les ventes directes 2023 (invoice_type='purchase') :
 *  1. offer.status           : 'pending' → 'accepted'
 *  2. offer.converted_to_contract : false → true
 *  3. offer.margin           : recalculé depuis offer_equipment
 *  4. invoice.billing_data   : ajoute client_name + client_id
 *  5. invoice.paid_at        : mis à invoice_date
 *
 * Ne s'appuie pas sur le manifest — interroge directement la DB.
 *
 * Usage :
 *   node scripts/patch-direct-sales-v2.js --dry-run
 *   node scripts/patch-direct-sales-v2.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const DRY_RUN              = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN\n');
  else console.log('\n🔧 PATCH VENTES DIRECTES 2023 (v2)\n');

  // Fetch all direct sale invoices for 2023
  const { data: invoices, error: ie } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, billing_data, offer_id, amount')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'purchase')
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31')
    .order('invoice_number');

  if (ie) throw new Error('Invoices fetch: ' + ie.message);
  console.log(`📋 ${invoices.length} factures vente directe 2023 trouvées\n`);

  let fixed = 0, errors = 0, skipped = 0;

  for (const inv of invoices) {
    if (!inv.offer_id) {
      console.log(`  ⏭️  ${inv.invoice_number}: pas de offer_id → skip`);
      skipped++;
      continue;
    }

    // Fetch offer with client info
    const { data: offer, error: oe } = await sb
      .from('offers')
      .select('id, client_id, client_name, amount, status, converted_to_contract')
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

    // Fallback to invoice amount if no equipment
    if (totalSelling === 0) totalSelling = inv.amount || 0;

    const marginAmt = totalSelling - totalPurchase;
    const marginPct = totalSelling > 0
      ? Math.round((marginAmt / totalSelling) * 100)
      : 0;

    // Fetch client details
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

    const alreadyPatched = inv.billing_data?.client_id
      && offer.status === 'accepted'
      && offer.converted_to_contract === true;

    console.log(`  📄 ${inv.invoice_number}`);
    console.log(`       client    : "${clientName}" (id: ${clientId?.slice(0,8) ?? 'null'})`);
    console.log(`       selling   : ${totalSelling.toFixed(2)}€ | purchase: ${totalPurchase.toFixed(2)}€ | marge: ${marginAmt.toFixed(2)}€ (${marginPct}%)`);
    console.log(`       workflow  : ${offer.workflow_status} → invoicing | converted: ${offer.converted_to_contract} → true`);
    if (alreadyPatched) console.log(`       ℹ️  déjà patché`);

    if (DRY_RUN) { fixed++; continue; }

    // ── Patch offer ──────────────────────────────────────────────────────
    // workflow_status='invoicing' → apparaît dans "Facturées" (achat direct)
    // status='accepted' reste pour la cohérence du champ status
    const { error: offerPatchErr } = await sb
      .from('offers')
      .update({
        status:                'accepted',
        workflow_status:       'invoicing',
        converted_to_contract: true,
        margin:                marginPct,
        updated_at:            new Date().toISOString(),
      })
      .eq('id', offer.id);

    if (offerPatchErr) {
      console.log(`    ❌ Offer patch: ${offerPatchErr.message}`);
      errors++;
      continue;
    }

    // ── Fetch full client record for client_data ──────────────────────────
    let clientRecord = null;
    if (clientId) {
      const { data: cr } = await sb
        .from('clients')
        .select('id, name, company, email, phone, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
        .eq('id', clientId)
        .single();
      clientRecord = cr;
    }

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

    // ── Patch invoice billing_data ────────────────────────────────────────
    const newBillingData = {
      ...(inv.billing_data || {}),
      // Correct nested structure expected by the frontend
      client_data: clientDataObj,
      offer_data: {
        ...(inv.billing_data?.offer_data || {}),
        is_purchase: true,
      },
      invoice_totals: {
        vat_rate:       0.21,
        vat_amount:     Math.round(totalSelling * 0.21 * 100) / 100,
        total_excl_vat: Math.round(totalSelling * 100) / 100,
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
  console.log(`  ⏭️  Ignorées  : ${skipped}`);
  console.log(`  ❌ Erreurs   : ${errors}`);
  if (DRY_RUN) console.log('\n  (dry-run : aucune modification effectuée)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
