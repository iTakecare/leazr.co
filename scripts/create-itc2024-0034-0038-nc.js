/**
 * create-itc2024-0034-0038-nc.js
 *
 * Crée en DB :
 *   ITC-2024-0034  Grenke leasing  dossier 180-22627  €3.913,11  (Nicolas Lehette / Euthymia SRL)
 *   ITC-2024-NC-002 Note de crédit annulant 0034       -€3.913,11
 *   ITC-2024-0038  Grenke leasing  dossier 180-22428  €8.352,20  (client à trouver)
 *   ITC-2024-NC-001 Note de crédit annulant 0038       -€8.352,20
 *
 * Net CA : 0€ pour chaque paire → CA leasing reste 312.653,84€
 *
 * Usage :
 *   node scripts/create-itc2024-0034-0038-nc.js          → dry-run
 *   node scripts/create-itc2024-0034-0038-nc.js --apply  → crée
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const LEASER_DATA = {
  name: 'GRENKE LEASE', address: 'Ruisbroeksesteenweg 76',
  city: 'Ukkel', postal_code: '1180', country: 'Belgique',
  email: '', phone: '', vat_number: 'BE 0873.803.219',
};

// ── ITC-2024-0034 ────────────────────────────────────────────────────────────
const INV_0034 = {
  invoice_number: 'ITC-2024-0034',
  invoice_date:   '2024-04-27',
  dossier:        '180-22627',
  offer_id:       '52fefe4d-3499-47ca-950d-c9f08632cc7a', // Nicolas Lehette / Euthymia SRL
  amount:         3913.11,
  equipment_data: [
    { title: 'iMac 24 M1 8Go / 1To SSD RFB GRA',    serial_number: ['C02GJ2L1Q6W8'], selling_price_excl_vat: 1700.00, quantity: 1 },
    { title: 'iPad Pro 12.9 M1 128Go Wifi + 5G',     serial_number: ['LM2N3GXDCR'],  selling_price_excl_vat: 1865.00, quantity: 1 },
    { title: 'Logitech Combo Touch iPad Pro 12.9',   serial_number: [],               selling_price_excl_vat:  225.00, quantity: 1 },
    { title: 'Apple Pencil 2',                       serial_number: [],               selling_price_excl_vat:  123.11, quantity: 1 },
  ],
};

// ── ITC-2024-NC-002 (annule 0034) ────────────────────────────────────────────
const NC_002 = {
  invoice_number:    'ITC-2024-NC-002',
  invoice_date:      '2024-11-29',
  cancels:           'ITC-2024-0034',
  amount:            -3913.11,
};

// ── ITC-2024-0038 ────────────────────────────────────────────────────────────
const INV_0038 = {
  invoice_number: 'ITC-2024-0038',
  invoice_date:   '2024-04-27',
  dossier:        '180-22428',
  offer_id:       null, // à trouver ci-dessous
  amount:         8352.20,
  equipment_data: [
    { title: 'MacBook Pro 16 M1 Pro 16Go 512 Go SSD RFB GR A', serial_number: ['NQJQX6T09M'],        selling_price_excl_vat: 2650.00, quantity: 1 },
    { title: 'iPhone 14 Pro Max 128Go RFB GR A',               serial_number: ['358034163201756'],   selling_price_excl_vat: 1789.93, quantity: 1 },
    { title: 'iPad Pro 12.9 pouces M1 - 128 Go Wifi RFB GR A', serial_number: ['SCM65WH3X2W'],       selling_price_excl_vat: 1807.27, quantity: 1 },
    { title: 'Epson EcoTank A3 ET-16650',                      serial_number: ['X6ML010362'],        selling_price_excl_vat: 1300.00, quantity: 1 },
    { title: 'Logitech Combo Touch pour iPad 12.9',            serial_number: [],                    selling_price_excl_vat:  225.00, quantity: 1 },
    { title: 'Ecran Samsung incurvé 27\'\'',                   serial_number: ['5MX4H9YTX100820'],   selling_price_excl_vat:  195.00, quantity: 1 },
    { title: 'Apple Pencil 2',                                 serial_number: [],                    selling_price_excl_vat:  135.00, quantity: 1 },
    { title: 'pack acces. : mallette / souris bluetooth / hub',serial_number: [],                    selling_price_excl_vat:   70.00, quantity: 1 },
    { title: 'AirPods 3',                                      serial_number: [],                    selling_price_excl_vat:  180.00, quantity: 1 },
  ],
};

// ── ITC-2024-NC-001 (annule 0038) ────────────────────────────────────────────
const NC_001 = {
  invoice_number:    'ITC-2024-NC-001',
  invoice_date:      '2024-09-30',
  cancels:           'ITC-2024-0038',
  amount:            -8352.20,
};

async function getClientForOffer(offerId) {
  if (!offerId) return null;
  const { data: offer } = await sb.from('offers').select('client_id').eq('id', offerId).single();
  if (!offer?.client_id) return null;
  const { data: c } = await sb.from('clients')
    .select('id, name, company, email, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
    .eq('id', offer.client_id).single();
  return c;
}

async function findOffer0038() {
  const { data: allOffers } = await sb.from('offers')
    .select('id, status, amount, client_id, remarks')
    .eq('company_id', COMPANY_ID)
    .eq('status', 'accepted');
  const match = allOffers?.filter(o => Math.abs((o.amount || 0) - 8352.20) < 5);
  return match?.[0] || null;
}

async function createInvoice(inv, contractData, clientData, isCreditNote = false) {
  const totalExcl  = Math.abs(inv.amount);
  const billingData = isCreditNote ? {
    leaser_data: LEASER_DATA,
    credit_note: {
      cancels_invoice: inv.cancels,
      reason: 'Annulation de la facture originale',
    },
    invoice_totals: {
      total_excl_vat: -totalExcl,
      vat_amount:     -Math.round(totalExcl * 0.21 * 100) / 100,
      total_incl_vat: -Math.round(totalExcl * 1.21 * 100) / 100,
    },
  } : {
    leaser_data: LEASER_DATA,
    contract_data: contractData,
    equipment_data: inv.equipment_data,
    invoice_totals: {
      total_excl_vat: totalExcl,
      vat_amount:     Math.round(totalExcl * 0.21 * 100) / 100,
      total_incl_vat: Math.round(totalExcl * 1.21 * 100) / 100,
    },
  };

  if (!APPLY) return true;

  const { data, error } = await sb.from('invoices').insert({
    company_id:       COMPANY_ID,
    offer_id:         inv.offer_id || null,
    contract_id:      null,
    invoice_type:     isCreditNote ? 'credit_note' : 'leasing',
    invoice_number:   inv.invoice_number,
    amount:           inv.amount,
    status:           'paid',
    leaser_name:      'Grenke',
    integration_type: 'leasing',
    invoice_date:     inv.invoice_date,
    paid_at:          new Date(inv.invoice_date).toISOString(),
    billing_data:     billingData,
    created_at:       new Date(inv.invoice_date).toISOString(),
    updated_at:       new Date().toISOString(),
  }).select('id').single();

  if (error) { console.log(`   ❌ ${inv.invoice_number}: ${error.message}`); return false; }
  console.log(`   ✅ ${inv.invoice_number} créée | id=${data.id}`);
  return true;
}

async function main() {
  console.log(`\n🔧 CREATE 0034 + 0038 + NC-001 + NC-002 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Trouver offer pour 0038
  const offer0038 = await findOffer0038();
  if (offer0038) {
    INV_0038.offer_id = offer0038.id;
    console.log(`  Offer 0038 : id=${offer0038.id} amount=${offer0038.amount}`);
    const cl = await getClientForOffer(offer0038.id);
    if (cl) console.log(`  Client 0038 : "${cl.name}" / "${cl.company}"`);
  } else {
    console.log('  ⚠️  Aucun offer trouvé pour 0038 (~€8352) — offer_id=null');
  }

  // Client pour 0034
  const client0034 = await getClientForOffer(INV_0034.offer_id);
  if (client0034) console.log(`  Client 0034 : "${client0034.name}" / "${client0034.company}"`);

  // Vérifier si déjà en DB
  const nums = [INV_0034.invoice_number, INV_0038.invoice_number, NC_001.invoice_number, NC_002.invoice_number];
  const { data: existing } = await sb.from('invoices')
    .select('invoice_number').eq('company_id', COMPANY_ID).in('invoice_number', nums);
  if (existing?.length) {
    console.log('\n  ⚠️  Déjà en DB :', existing.map(e => e.invoice_number).join(', '));
  }

  const missing = nums.filter(n => !existing?.find(e => e.invoice_number === n));
  console.log('\n  À créer :');
  missing.forEach(n => console.log(`    ${n}`));

  if (!APPLY) { console.log('\n  → Relance avec --apply pour créer\n'); return; }

  console.log();

  // Créer contract_data pour les factures leasing
  const mkContractData = (client, offerId) => ({
    id: null, offer_id: offerId || null, created_at: null, status: 'active',
    client_name: client?.name || '', client_company: client?.company || '', client_email: client?.email || '',
  });

  if (missing.includes('ITC-2024-0034')) {
    INV_0034.offer_id = INV_0034.offer_id;
    await createInvoice(INV_0034, mkContractData(client0034, INV_0034.offer_id));
  }
  if (missing.includes('ITC-2024-NC-002')) {
    NC_002.offer_id = INV_0034.offer_id;
    await createInvoice(NC_002, null, null, true);
  }

  const client0038 = await getClientForOffer(INV_0038.offer_id);
  if (missing.includes('ITC-2024-0038')) {
    await createInvoice(INV_0038, mkContractData(client0038, INV_0038.offer_id));
  }
  if (missing.includes('ITC-2024-NC-001')) {
    NC_001.offer_id = INV_0038.offer_id;
    await createInvoice(NC_001, null, null, true);
  }

  console.log('\n  ✅ Terminé. Net CA = 0€ (les notes de crédit annulent les factures)\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
