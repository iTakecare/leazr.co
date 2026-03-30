/**
 * fix-direct-sales-amounts.js
 *
 * Corrige 4 erreurs de montants dans les ventes directes importées :
 *   1. ITC-2023-0039 Repairo         : PV 450€ → 400€
 *   2. ITC-2023-0038 Anthony Debacker : PV 4985.93 → 4985.43€
 *   3. ITC-2023-0034 Alta Taurus SL   : PV 3339.86 → 3339.67€ (& selling_price eq)
 *   4. ITC-2023-0040 MA.DE Management : purchase_price eq 100 → 0€ (bug JS falsy)
 *
 * Usage :
 *   node scripts/fix-direct-sales-amounts.js --dry-run
 *   node scripts/fix-direct-sales-amounts.js
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const DRY_RUN              = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const FIXES = [
  {
    invoice_number: 'ITC-2023-0039',
    label: 'Repairo',
    new_invoice_amount: 400.00,
    new_offer_amount:   400.00,
    eq_update: null, // offer_equipment already correct (2 × 200 = 400)
  },
  {
    invoice_number: 'ITC-2023-0038',
    label: 'Anthony Debacker (Us Barbershop)',
    new_invoice_amount: 4985.43,
    new_offer_amount:   4985.43,
    eq_update: { old_selling: 4985.93, new_selling: 4985.43 },
  },
  {
    invoice_number: 'ITC-2023-0034',
    label: 'Alta Taurus SL',
    new_invoice_amount: 3339.67,
    new_offer_amount:   3339.67,
    eq_update: { old_selling: 3339.86, new_selling: 3339.67 },
  },
  {
    invoice_number: 'ITC-2023-0040',
    label: 'MA.DE Management (purchase_price 100→0)',
    new_invoice_amount: null, // invoice amount stays 100€ (correct selling)
    new_offer_amount:   null,
    eq_update: { fix_purchase_price: true, new_purchase: 0.00 },
  },
];

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN\n');
  else console.log('\n🔧 CORRECTION MONTANTS VENTES DIRECTES\n');

  for (const fix of FIXES) {
    console.log(`\n── ${fix.invoice_number} : ${fix.label}`);

    // Fetch invoice
    const { data: inv } = await sb.from('invoices')
      .select('id, amount, offer_id')
      .eq('company_id', COMPANY_ID)
      .eq('invoice_number', fix.invoice_number)
      .single();

    if (!inv) { console.log('  ❌ Facture introuvable'); continue; }

    if (fix.new_invoice_amount !== null) {
      console.log(`  invoice.amount   : ${inv.amount}€ → ${fix.new_invoice_amount}€`);
    }

    // Fetch offer
    const { data: offer } = await sb.from('offers')
      .select('id, amount')
      .eq('id', inv.offer_id)
      .single();

    if (fix.new_offer_amount !== null) {
      console.log(`  offer.amount     : ${offer?.amount}€ → ${fix.new_offer_amount}€`);
    }

    // Fetch offer_equipment
    const { data: eqs } = await sb.from('offer_equipment')
      .select('id, selling_price, purchase_price, quantity')
      .eq('offer_id', inv.offer_id);

    if (eqs?.length) {
      for (const eq of eqs) {
        if (fix.eq_update?.old_selling) {
          console.log(`  offer_equipment.selling_price : ${eq.selling_price}€ → ${fix.eq_update.new_selling}€`);
        }
        if (fix.eq_update?.fix_purchase_price) {
          console.log(`  offer_equipment.purchase_price: ${eq.purchase_price}€ → ${fix.eq_update.new_purchase}€`);
        }
      }
    }

    if (DRY_RUN) { console.log('  [DRY] Aucune modification'); continue; }

    // Apply fixes
    if (fix.new_invoice_amount !== null) {
      await sb.from('invoices').update({ amount: fix.new_invoice_amount, updated_at: new Date().toISOString() }).eq('id', inv.id);
    }
    if (fix.new_offer_amount !== null && offer) {
      await sb.from('offers').update({ amount: fix.new_offer_amount, updated_at: new Date().toISOString() }).eq('id', offer.id);
    }
    if (fix.eq_update && eqs?.length) {
      for (const eq of eqs) {
        const update = {};
        if (fix.eq_update.old_selling) update.selling_price = fix.eq_update.new_selling;
        if (fix.eq_update.fix_purchase_price) update.purchase_price = fix.eq_update.new_purchase;
        update.updated_at = new Date().toISOString();
        await sb.from('offer_equipment').update(update).eq('id', eq.id);
      }
    }
    console.log('  ✅ Corrigé');
  }

  console.log('\n── Vérification finale ──');
  const { data: invoices } = await sb.from('invoices')
    .select('invoice_number, amount')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'purchase')
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31');
  const total = (invoices || []).reduce((s, i) => s + (i.amount || 0), 0);
  console.log(`  Total CA ventes directes 2023 : ${total.toFixed(2)}€  (attendu: 46259.00€)`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
