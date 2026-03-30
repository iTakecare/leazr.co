/**
 * create-itc2025-0014-and-nc.js
 *
 * ITC-2025-0014 n'existe pas en DB.
 * Ce script :
 *   1. Cherche l'offre liée (dossier 180-26982, ~2195€)
 *   2. Crée ITC-2025-0014 dans invoices (leasing, 2195.05€, 08/04/2025, paid)
 *   3. Crée ITC-2025-NC-001 dans credit_notes (-2195.05€, 03/06/2025)
 *   4. Lie la facture à la NC (credit_note_id, credited_amount)
 *
 * Équipements :
 *   - MacBook Air M2 15 8Go 256Go RFB GR A | SN: JW4XWR744    → 1,200.00€
 *   - iPhone 15 Pro 128Go RFB GR A | SN: 359473646858528       →   995.05€
 *
 * Usage :
 *   node scripts/create-itc2025-0014-and-nc.js          → dry-run
 *   node scripts/create-itc2025-0014-and-nc.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const BILLING_DATA = {
  leaser_data: {
    name:        'GRENKE LEASE',
    address:     'Ruisbroeksesteenweg 76',
    postal_code: '1180',
    city:        'Ukkel',
    country:     'Belgique',
    vat_number:  'BE 0873.803.219',
    email:       '',
    phone:       '',
  },
  contract_data: {
    dossier: '180-26982',
  },
  equipment_data: [
    {
      title:          'MacBook Air M2 15 8Go 256Go RFB GR A',
      serial_number:  'JW4XWR744',
      purchase_price: 1200.00,
      quantity:       1,
      monthly_payment: null,
    },
    {
      title:          'iPhone 15 Pro 128Go RFB GR A',
      serial_number:  '359473646858528',
      purchase_price: 995.05,
      quantity:       1,
      monthly_payment: null,
    },
  ],
  invoice_totals: {
    total_excl_vat: 2195.05,
    vat_amount:     460.96,
    total_incl_vat: 2656.01,
  },
};

async function main() {
  console.log(`\n🔧 CREATE ITC-2025-0014 + NC-001 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Vérifie si la facture existe déjà ──────────────────────────────────
  const { data: existing } = await sb
    .from('invoices')
    .select('id, invoice_number')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2025-0014')
    .maybeSingle();

  if (existing) {
    console.log(`  ⚠️  ITC-2025-0014 existe déjà (${existing.id})`);
    return;
  }

  // ── 2. Cherche l'offre liée (dossier 180-26982 ou montant ~2195€) ─────────
  console.log('  🔍 Recherche offre liée au dossier 180-26982...');

  // Cherche dans billing_data des offres
  const { data: offers } = await sb
    .from('offers')
    .select('id, client_name, amount, status, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('amount', 2000)
    .lte('amount', 2400);

  let matchedOffer = null;
  if (offers?.length) {
    for (const o of offers) {
      const dossier = o.billing_data?.dossier || o.billing_data?.contract_data?.dossier || '';
      if (dossier.includes('26982') || Math.abs(o.amount - 2195.05) < 1) {
        matchedOffer = o;
        console.log(`  ✅ Offre trouvée : ${o.id} | ${o.client_name} | ${o.amount}€ | dossier=${dossier}`);
        break;
      }
    }
    if (!matchedOffer) {
      console.log(`  ⚠️  Aucune offre exacte. Offres ~2195€ :`);
      offers.forEach(o => console.log(`     ${o.id.slice(0,8)} | ${o.client_name} | ${o.amount}€`));
    }
  } else {
    console.log('  ⚠️  Aucune offre dans la plage 2000-2400€ trouvée');
  }

  // ── 3. Définition de la facture ───────────────────────────────────────────
  const invoiceRecord = {
    company_id:       COMPANY_ID,
    invoice_number:   'ITC-2025-0014',
    invoice_type:     'leasing',
    integration_type: 'leasing',
    leaser_name:      'Grenke',
    amount:           2195.05,
    status:           'paid',
    invoice_date:     '2025-04-08',
    paid_at:          '2025-06-03T00:00:00.000+00:00',
    due_date:         '2025-04-08',
    offer_id:         matchedOffer?.id || null,
    contract_id:      null,
    billing_data:     BILLING_DATA,
  };

  console.log(`\n  📄 ITC-2025-0014`);
  console.log(`     invoice_date : ${invoiceRecord.invoice_date}`);
  console.log(`     amount       : ${invoiceRecord.amount}€`);
  console.log(`     status       : ${invoiceRecord.status}`);
  console.log(`     offer_id     : ${invoiceRecord.offer_id || 'null (aucune offre trouvée)'}`);

  console.log(`\n  📄 ITC-2025-NC-001`);
  console.log(`     issued_at    : 2025-06-03`);
  console.log(`     amount       : 2195.05€ (annule ITC-2025-0014)`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour créer\n');
    return;
  }

  // ── 4. Création de la facture ─────────────────────────────────────────────
  const { data: createdInv, error: invErr } = await sb
    .from('invoices')
    .insert(invoiceRecord)
    .select('id, invoice_number')
    .single();

  if (invErr) { console.log(`\n  ❌ Erreur facture : ${invErr.message}`); return; }
  console.log(`\n  ✅ Facture créée : ${createdInv.invoice_number} (${createdInv.id})`);

  // ── 5. Création de la NC dans credit_notes ────────────────────────────────
  const ncRecord = {
    company_id:         COMPANY_ID,
    invoice_id:         createdInv.id,
    credit_note_number: 'ITC-2025-NC-001',
    amount:             2195.05,
    reason:             'Annulation contrat',
    status:             'applied',
    issued_at:          '2025-06-03T00:00:00.000+00:00',
    billing_data: {
      ...BILLING_DATA,
      contract_data: {
        ...BILLING_DATA.contract_data,
        ...(matchedOffer?.billing_data?.contract_data || {}),
      },
    },
  };

  const { data: createdNC, error: ncErr } = await sb
    .from('credit_notes')
    .insert(ncRecord)
    .select('id, credit_note_number')
    .single();

  if (ncErr) { console.log(`  ❌ Erreur NC : ${ncErr.message}`); return; }
  console.log(`  ✅ NC créée : ${createdNC.credit_note_number} (${createdNC.id})`);

  // ── 6. Liaison credit_note_id sur la facture ──────────────────────────────
  const { error: updErr } = await sb
    .from('invoices')
    .update({ credit_note_id: createdNC.id, credited_amount: 2195.05 })
    .eq('id', createdInv.id);

  if (updErr) console.log(`  ❌ Liaison : ${updErr.message}`);
  else        console.log(`  ✅ ITC-2025-0014 liée → credit_note_id=${createdNC.id}\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
