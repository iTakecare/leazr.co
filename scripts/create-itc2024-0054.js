/**
 * create-itc2024-0054.js
 *
 * ITC-2024-0054 absente en DB — la crée complètement :
 *   Client  : L'ACQUA E FARINA 2018 (BE 0693.678.474)
 *             Place Maugrétout(L.L) 12, 7100 La Louvière
 *   Equip   : APPETITO BOX V2 × 1 @ €199,00 | SN: A59T12BGT4C00805
 *   Date    : 29/05/2024  Payé en ligne
 *
 * Étapes :
 *   1. Vérifie si le client existe déjà (recherche large)
 *   2. Crée le client si absent
 *   3. Crée l'offer (type purchase, montant 199)
 *   4. Crée l'offer_equipment
 *   5. Crée la facture avec billing_data complet
 *
 * Usage :
 *   node scripts/create-itc2024-0054.js          → dry-run
 *   node scripts/create-itc2024-0054.js --apply  → crée
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ── Données PDF ──────────────────────────────────────────────────────────────
const CLIENT = {
  name:                 "L'ACQUA E FARINA 2018",
  company:              "L'ACQUA E FARINA 2018",
  vat_number:           'BE 0693.678.474',
  billing_address:      'Place Maugrétout(L.L) 12',
  billing_city:         'La Louvière',
  billing_postal_code:  '7100',
  billing_country:      'Belgique',
  email:                '',
  phone:                '',
};

const EQUIPMENT = {
  title:                  'APPETITO BOX V2',
  serial_number:          ['A59T12BGT4C00805'],
  selling_price_excl_vat: 199.00,
  quantity:               1,
};

const INVOICE_DATE = '2024-05-29';
const TOTAL_EXCL   = 199.00;
const VAT_AMOUNT   = 41.79;
const TOTAL_INCL   = 240.79;

async function main() {
  console.log(`\n🔧 CREATE ITC-2024-0054 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Cherche une référence Appetito Box similaire pour obtenir un offer existant
  const { data: similarOffer } = await sb
    .from('invoices')
    .select('offer_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2024-0047')
    .single();

  if (similarOffer?.offer_id) {
    const { data: refOffer } = await sb.from('offers')
      .select('id, status, type, workflow_status')
      .eq('id', similarOffer.offer_id).single();
    console.log(`  Offer référence (ITC-2024-0047) :`, JSON.stringify(refOffer));
  }

  // 1. Cherche client (large)
  const { data: existing } = await sb
    .from('clients')
    .select('id, name, company, email')
    .eq('company_id', COMPANY_ID)
    .or('name.ilike.%acqua%,company.ilike.%acqua%,name.ilike.%farina%,company.ilike.%farina%,vat_number.eq.BE 0693.678.474');

  let clientId = null;
  if (existing?.length) {
    console.log('  Client existant trouvé :');
    existing.forEach(c => console.log(`    id=${c.id} | "${c.name}" / "${c.company}"`));
    clientId = existing[0].id;
  } else {
    console.log(`  Client à créer : "${CLIENT.name}" (${CLIENT.vat_number})`);
    if (APPLY) {
      const { data: newClient, error: clientErr } = await sb
        .from('clients')
        .insert({ ...CLIENT, company_id: COMPANY_ID, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select('id').single();
      if (clientErr) { console.log('  ❌ Client:', clientErr.message); return; }
      clientId = newClient.id;
      console.log(`  ✅ Client créé : id=${clientId}`);
    }
  }

  // 2. Crée l'offer
  console.log(`  Offer à créer : APPETITO BOX V2 × 1 @ €199 pour client=${clientId || '(pending)'}`);
  let offerId = null;
  if (APPLY && clientId) {
    const { data: newOffer, error: offerErr } = await sb
      .from('offers')
      .insert({
        company_id:            COMPANY_ID,
        client_id:             clientId,
        client_name:           CLIENT.name,
        status:                'accepted',
        workflow_status:       'invoicing',
        converted_to_contract: true,
        is_purchase:           true,
        amount:                TOTAL_EXCL,
        margin:                0,
        monthly_payment:       0,
        remarks:               '[fix-itc2024-0054] Facture ITC-2024-0054',
        created_at:            new Date(INVOICE_DATE).toISOString(),
        updated_at:            new Date().toISOString(),
      })
      .select('id').single();
    if (offerErr) { console.log('  ❌ Offer:', offerErr.message); return; }
    offerId = newOffer.id;
    console.log(`  ✅ Offer créé : id=${offerId}`);

    // 3. Crée offer_equipment
    const { error: eqErr } = await sb
      .from('offer_equipment')
      .insert({
        offer_id:       offerId,
        title:          EQUIPMENT.title,
        quantity:       EQUIPMENT.quantity,
        purchase_price: TOTAL_EXCL,
        selling_price:  TOTAL_EXCL,
        margin:         0,
        monthly_payment: 0,
        serial_number:  EQUIPMENT.serial_number,
        duration:       0,
        order_status:   'delivered',
        created_at:     new Date(INVOICE_DATE).toISOString(),
        updated_at:     new Date().toISOString(),
      });
    if (eqErr) console.log(`  ⚠️  offer_equipment: ${eqErr.message}`);
    else console.log('  ✅ offer_equipment créé');
  }

  // 4. Crée la facture
  const billingData = {
    client_data: {
      id:           clientId || null,
      name:         CLIENT.name,
      company:      CLIENT.company,
      email:        CLIENT.email,
      vat_number:   CLIENT.vat_number,
      address:      CLIENT.billing_address,
      city:         CLIENT.billing_city,
      postal_code:  CLIENT.billing_postal_code,
      country:      CLIENT.billing_country,
    },
    offer_data: {
      is_purchase:  true,
      offer_number: 'ITC-2024-0054',
    },
    equipment_data: [EQUIPMENT],
    invoice_totals: {
      total_excl_vat: TOTAL_EXCL,
      vat_amount:     VAT_AMOUNT,
      total_incl_vat: TOTAL_INCL,
    },
    imported: true,
    source:   'fix-itc2024-0054',
  };

  console.log(`  Facture à créer : ITC-2024-0054 | ${INVOICE_DATE} | €${TOTAL_EXCL} HTVA`);

  if (APPLY) {
    const { data: newInv, error: invErr } = await sb
      .from('invoices')
      .insert({
        company_id:       COMPANY_ID,
        offer_id:         offerId,
        contract_id:      null,
        invoice_type:     'purchase',
        invoice_number:   'ITC-2024-0054',
        amount:           TOTAL_EXCL,
        status:           'paid',
        leaser_name:      'Direct',
        integration_type: 'direct',
        invoice_date:     INVOICE_DATE,
        paid_at:          new Date(INVOICE_DATE).toISOString(),
        billing_data:     billingData,
        created_at:       new Date(INVOICE_DATE).toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .select('id').single();
    if (invErr) { console.log('  ❌ Invoice:', invErr.message); return; }
    console.log(`  ✅ Facture créée : ITC-2024-0054 | id=${newInv.id}`);
  }

  if (!APPLY) console.log('\n  → Relance avec --apply pour créer\n');
  else console.log('\n  ✅ Terminé.\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
