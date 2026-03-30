/**
 * create-itc2024-0034.js
 *
 * ITC-2024-0034 — Grenke leasing, dossier 180-22627
 * Absente en DB. Un offer à ~3913€ existe (52fefe4d).
 * Ce script :
 *   1. Inspecte l'offer 52fefe4d et son contrat/client
 *   2. Crée la facture avec billing_data complet (données du JSON Grenke)
 *
 * Équipements (PDF/JSON) :
 *   iMac 24 M1 8Go / 1To SSD RFB GRA            × 1 @ €1700.00 | SN: C02GJ2L1Q6W8
 *   iPad Pro 12.9 M1 128Go Wifi + 5G             × 1 @ €1865.00 | SN: LM2N3GXDCR
 *   Logitech Combo Touch iPad Pro 12.9           × 1 @ €225.00
 *   Apple Pencil 2                               × 1 @ €123.11
 *   Total : €3913.11
 *
 * Usage :
 *   node scripts/create-itc2024-0034.js          → diagnostic
 *   node scripts/create-itc2024-0034.js --apply  → crée la facture
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY   = process.argv.includes('--apply');
const sb      = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const OFFER_ID = '52fefe4d-3499-47ca-950d-c9f08632cc7a';

const LEASER_DATA = {
  name: 'GRENKE LEASE', address: 'Ruisbroeksesteenweg 76',
  city: 'Ukkel', postal_code: '1180', country: 'Belgique',
  email: '', phone: '', vat_number: 'BE 0873.803.219',
};

const EQUIPMENT_DATA = [
  { title: 'iMac 24 M1 8Go / 1To SSD RFB GRA',      serial_number: ['C02GJ2L1Q6W8'], selling_price_excl_vat: 1700.00, quantity: 1 },
  { title: 'iPad Pro 12.9 M1 128Go Wifi + 5G',       serial_number: ['LM2N3GXDCR'],  selling_price_excl_vat: 1865.00, quantity: 1 },
  { title: 'Logitech Combo Touch iPad Pro 12.9',      serial_number: [],              selling_price_excl_vat:  225.00, quantity: 1 },
  { title: 'Apple Pencil 2',                          serial_number: [],              selling_price_excl_vat:  123.11, quantity: 1 },
];

const TOTAL_EXCL   = 3913.11;
const INVOICE_DATE = '2024-04-27';

async function main() {
  console.log(`\n🔧 CREATE ITC-2024-0034 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // 1. Inspecte l'offer
  const { data: offer } = await sb.from('offers')
    .select('id, status, workflow_status, client_id, amount, remarks, converted_to_contract')
    .eq('id', OFFER_ID).single();

  if (!offer) { console.log('❌ Offer introuvable'); return; }

  console.log('── Offer 52fefe4d ──');
  console.log(`   status          : ${offer.status}`);
  console.log(`   workflow_status : ${offer.workflow_status}`);
  console.log(`   amount          : ${offer.amount}`);
  console.log(`   remarks         : ${offer.remarks}`);
  console.log(`   client_id       : ${offer.client_id}`);

  // Client
  let client = null;
  if (offer.client_id) {
    const { data: cl } = await sb.from('clients')
      .select('id, name, company, email, phone, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
      .eq('id', offer.client_id).single();
    client = cl;
    if (cl) console.log(`   client          : "${cl.name}" / "${cl.company}"`);
  }

  // Contrat lié à cet offer
  const { data: contracts } = await sb.from('contracts')
    .select('id, status, leaser_contract_id, leasing_amount')
    .eq('offer_id', OFFER_ID);

  let contractId = null;
  if (contracts?.length) {
    console.log(`\n── Contrats liés ──`);
    for (const c of contracts) {
      console.log(`   id=${c.id} | leaser_id=${c.leaser_contract_id} | amount=${c.leasing_amount} | status=${c.status}`);
      contractId = c.id;
      // Factures déjà liées
      const { data: invs } = await sb.from('invoices')
        .select('id, invoice_number, amount').eq('contract_id', c.id);
      if (invs?.length) invs.forEach(i => console.log(`   → facture existante: ${i.invoice_number} amount=${i.amount}`));
      else console.log('   → aucune facture liée');

      // contract_equipment
      const { data: ce } = await sb.from('contract_equipment')
        .select('id, title, purchase_price, quantity').eq('contract_id', c.id);
      if (ce?.length) {
        console.log('   → contract_equipment :');
        ce.forEach(r => console.log(`      "${r.title}" qty=${r.quantity} PA=${r.purchase_price}`));
      }
    }
  } else {
    console.log('\n   Aucun contrat lié à cet offer');
  }

  // 2. Résumé
  console.log('\n══ ACTION ══════════════════════════════════════════');
  console.log(`   Créer ITC-2024-0034 | ${INVOICE_DATE} | €${TOTAL_EXCL} | ${EQUIPMENT_DATA.length} équipements`);
  console.log(`   offer_id    : ${OFFER_ID}`);
  console.log(`   contract_id : ${contractId || '(null)'}`);

  if (!APPLY) { console.log('\n   → Relance avec --apply pour créer\n'); return; }

  // 3. Build billing_data
  const clientData = client ? {
    id: client.id, name: client.name, company: client.company || '',
    email: client.email || '', vat_number: client.vat_number || '',
    address: client.billing_address || '', city: client.billing_city || '',
    postal_code: client.billing_postal_code || '', country: client.billing_country || 'Belgique',
  } : null;

  const billingData = {
    leaser_data: LEASER_DATA,
    contract_data: {
      id:             contractId,
      offer_id:       OFFER_ID,
      created_at:     null,
      status:         'active',
      client_name:    client?.name    || '',
      client_company: client?.company || '',
      client_email:   client?.email   || '',
    },
    equipment_data: EQUIPMENT_DATA,
    invoice_totals: {
      total_excl_vat: TOTAL_EXCL,
      vat_amount:     Math.round(TOTAL_EXCL * 0.21 * 100) / 100,
      total_incl_vat: Math.round(TOTAL_EXCL * 1.21 * 100) / 100,
    },
  };

  const { data: newInv, error: invErr } = await sb.from('invoices').insert({
    company_id:       COMPANY_ID,
    offer_id:         OFFER_ID,
    contract_id:      contractId,
    invoice_type:     'leasing',
    invoice_number:   'ITC-2024-0034',
    amount:           TOTAL_EXCL,
    status:           'paid',
    leaser_name:      'Grenke',
    integration_type: 'leasing',
    invoice_date:     INVOICE_DATE,
    paid_at:          new Date(INVOICE_DATE).toISOString(),
    billing_data:     billingData,
    created_at:       new Date(INVOICE_DATE).toISOString(),
    updated_at:       new Date().toISOString(),
  }).select('id').single();

  if (invErr) { console.log(`   ❌ ${invErr.message}`); return; }
  console.log(`   ✅ Facture créée : ITC-2024-0034 | id=${newInv.id}`);
  console.log('\n   ✅ Terminé.\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
