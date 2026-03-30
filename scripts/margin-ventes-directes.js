/**
 * margin-ventes-directes.js
 * Calcule la marge totale sur les factures de vente directe 2023.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  // Fetch all purchase invoices (ventes directes) for 2023
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, offer_id')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'purchase')
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31')
    .order('invoice_date');

  if (error) throw new Error(error.message);
  console.log(`\n📋 ${invoices.length} factures vente directe 2023\n`);

  let totalCA = 0, totalAchat = 0, totalMarge = 0;
  const rows = [];

  for (const inv of invoices) {
    let selling = 0, purchase = 0;

    if (inv.offer_id) {
      const { data: eqs } = await sb
        .from('offer_equipment')
        .select('selling_price, purchase_price, quantity')
        .eq('offer_id', inv.offer_id);

      for (const eq of (eqs || [])) {
        const qty = eq.quantity || 1;
        selling  += (eq.selling_price  || 0) * qty;
        purchase += (eq.purchase_price || 0) * qty;
      }
    }

    // Fallback to invoice amount if no equipment
    if (selling === 0) selling = inv.amount || 0;
    const marge = selling - purchase;

    totalCA    += selling;
    totalAchat += purchase;
    totalMarge += marge;

    rows.push({ num: inv.invoice_number, date: inv.invoice_date, ca: selling, achat: purchase, marge });
  }

  // Display table
  console.log(`${'N° Facture'.padEnd(18)} ${'Date'.padEnd(12)} ${'CA HTVA'.padStart(12)} ${'Achat HTVA'.padStart(12)} ${'Marge'.padStart(10)} ${'%'.padStart(5)}`);
  console.log('─'.repeat(74));
  for (const r of rows) {
    const pct = r.ca > 0 ? ((r.marge / r.ca) * 100).toFixed(1) : '0.0';
    console.log(
      `${r.num.padEnd(18)} ${r.date.padEnd(12)} ${r.ca.toFixed(2).padStart(12)} ${r.achat.toFixed(2).padStart(12)} ${r.marge.toFixed(2).padStart(10)} ${(pct+'%').padStart(5)}`
    );
  }
  console.log('─'.repeat(74));

  const pctTotal = totalCA > 0 ? ((totalMarge / totalCA) * 100).toFixed(1) : '0.0';
  console.log(
    `${'TOTAL'.padEnd(18)} ${''.padEnd(12)} ${totalCA.toFixed(2).padStart(12)} ${totalAchat.toFixed(2).padStart(12)} ${totalMarge.toFixed(2).padStart(10)} ${(pctTotal+'%').padStart(5)}`
  );
  console.log();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
