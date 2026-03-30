/**
 * fix-itc2024-0054.js
 *
 * ITC-2024-0054 — L'ACQUA E FARINA 2018
 *   APPETITO BOX V2 × 1 @ €199,00 | SN: A59T12BGT4C00805
 *   Date: 29/05/2024
 *
 * La facture n'apparaît pas dans la DB sous ce numéro.
 * Ce script :
 *   1. Cherche si elle existe sous un autre numéro
 *   2. Cherche le client "ACQUA E FARINA" dans clients
 *   3. Cherche l'offer correspondant
 *   4. En dry-run : affiche le diagnostic
 *   5. En --apply : met à jour billing_data si la facture existe, sinon signale
 *
 * Usage :
 *   node scripts/fix-itc2024-0054.js          → diagnostic
 *   node scripts/fix-itc2024-0054.js --apply  → applique si trouvé
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const BILLING_DATA = {
  equipment_data: [{
    title:                  'APPETITO BOX V2',
    serial_number:          ['A59T12BGT4C00805'],
    selling_price_excl_vat: 199.00,
    quantity:               1,
  }],
  invoice_totals: {
    total_excl_vat: 199.00,
    vat_amount:     41.79,
    total_incl_vat: 240.79,
  },
};

async function main() {
  console.log(`\n🔧 FIX ITC-2024-0054 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // 1. Cherche directement par numéro
  const { data: inv } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, offer_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2024-0054')
    .single();

  if (inv) {
    console.log(`  ✅ Facture trouvée : id=${inv.id}`);
    console.log(`     invoice_date : ${inv.invoice_date}`);
    console.log(`     offer_id     : ${inv.offer_id || '(null)'}`);
    console.log(`     billing_data : ${inv.billing_data ? 'présent' : 'null'}`);
    await applyFix(inv);
    return;
  }

  console.log('  ℹ️  ITC-2024-0054 introuvable — recherche alternatives...\n');

  // 2. Cherche le client "acqua e farina"
  const { data: clientResults } = await sb
    .from('clients')
    .select('id, name, company, email')
    .eq('company_id', COMPANY_ID)
    .or('name.ilike.%acqua%,company.ilike.%acqua%,name.ilike.%farina%,company.ilike.%farina%');

  if (clientResults?.length) {
    console.log(`  Clients trouvés :`);
    for (const c of clientResults) {
      console.log(`    id=${c.id} | "${c.name}" / "${c.company}"`);
    }

    // Cherche offers pour ce client
    for (const c of clientResults) {
      const { data: offers } = await sb
        .from('offers')
        .select('id, status, created_at, monthly_installment')
        .eq('client_id', c.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (offers?.length) {
        console.log(`\n  Offers pour "${c.name}" :`);
        for (const o of offers) {
          // Cherche facture liée à cet offer
          const { data: invs } = await sb
            .from('invoices')
            .select('id, invoice_number, invoice_date')
            .eq('company_id', COMPANY_ID)
            .eq('offer_id', o.id);

          console.log(`    offer=${o.id} | status=${o.status} | créé=${o.created_at?.slice(0,10)}`);
          if (invs?.length) {
            for (const i of invs) {
              console.log(`      → facture: ${i.invoice_number} [${i.invoice_date}] id=${i.id}`);
            }
          } else {
            console.log(`      → aucune facture liée`);
          }
        }
      }
    }
  } else {
    console.log('  ❌ Aucun client "acqua/farina" trouvé en DB');
  }

  // 3. Cherche aussi par date et montant (199€)
  console.log('\n  Recherche par date 2024-05-29 et montant ~199€ :');
  const { data: byDate } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2024-05-01')
    .lte('invoice_date', '2024-06-30')
    .order('invoice_number');

  for (const i of (byDate || [])) {
    const amt = i.amount || i.billing_data?.invoice_totals?.total_excl_vat || 0;
    if (Math.abs(amt - 199) < 1) {
      console.log(`    → ${i.invoice_number} [${i.invoice_date}] amount=${amt} id=${i.id}`);
    }
  }

  console.log('\n  ⚠️  Si la facture est introuvable, elle doit être créée manuellement dans Leazr.');
}

async function applyFix(inv) {
  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour mettre à jour billing_data\n');
    return;
  }

  // Récupérer client via offer
  let clientData = null;
  if (inv.offer_id) {
    const { data: offer } = await sb.from('offers').select('client_id').eq('id', inv.offer_id).single();
    if (offer?.client_id) {
      const { data: c } = await sb.from('clients')
        .select('id, name, company, email, phone, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
        .eq('id', offer.client_id).single();
      if (c) {
        clientData = {
          id: c.id, name: c.name, company: c.company || '',
          email: c.email || '', phone: c.phone || '',
          vat_number: c.vat_number || '',
          address: c.billing_address || '', city: c.billing_city || '',
          postal_code: c.billing_postal_code || '', country: c.billing_country || 'Belgique',
        };
      }
    }
  }

  const newBd = {
    ...(inv.billing_data || {}),
    client_data:    clientData || inv.billing_data?.client_data || { name: "L'ACQUA E FARINA 2018" },
    equipment_data: BILLING_DATA.equipment_data,
    invoice_totals: BILLING_DATA.invoice_totals,
  };

  const { error } = await sb.from('invoices')
    .update({ billing_data: newBd, updated_at: new Date().toISOString() })
    .eq('id', inv.id);

  if (error) {
    console.log(`  ❌ ${error.message}`);
  } else {
    console.log(`  ✅ billing_data mis à jour — APPETITO BOX V2 | SN: A59T12BGT4C00805`);
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
