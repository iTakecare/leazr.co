/**
 * diagnose-january.js
 * Affiche le détail exact de chaque facture de janvier 2023
 * et calcule les achats tels que le ferait le dashboard.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  // 1. Fetch all Jan 2023 invoices for company
  const { data: invoices, error } = await sb.from('invoices')
    .select('id, invoice_number, invoice_date, amount, credited_amount, contract_id, billing_data, company_id')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-01-31')
    .order('invoice_date');

  if (error) { console.error('❌', error.message); process.exit(1); }
  console.log(`\n📋 Factures janvier 2023 : ${invoices?.length || 0} trouvées\n`);

  let totalCA = 0;
  let totalAchats = 0;

  for (const inv of invoices || []) {
    const rev = (inv.amount || 0) - (inv.credited_amount || 0);
    let achats = 0;
    let achatSource = '';

    if (inv.contract_id) {
      // Fetch CE
      const { data: ce } = await sb.from('contract_equipment')
        .select('title, quantity, purchase_price, actual_purchase_price')
        .eq('contract_id', inv.contract_id);
      const ceTotal = (ce || []).reduce(
        (s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0
      );
      achats = ceTotal;
      achatSource = `contract_equipment (${ce?.length || 0} lignes)`;
    } else {
      // billing_data.equipment_data
      const eq = inv.billing_data?.equipment_data || [];
      const eqTotal = eq.reduce(
        (s, e) => s + (parseFloat(e.purchase_price) || 0) * (parseFloat(e.quantity) || 1), 0
      );
      achats = eqTotal;
      achatSource = eq.length
        ? `billing_data.equipment_data (${eq.length} items)`
        : 'AUCUN (0€)';
    }

    const marge = rev - achats;
    const flag = achats === 0 ? ' ⚠️  ACHATS = 0!' : '';

    console.log(`${(inv.invoice_number || '?').padEnd(20)} | ${inv.invoice_date?.substring(0,10)} | CA=${rev.toFixed(2).padStart(10)}€ | Achats=${achats.toFixed(2).padStart(10)}€ | Marge=${marge.toFixed(2).padStart(10)}€${flag}`);
    console.log(`  contract_id: ${inv.contract_id?.substring(0,8) || 'NULL      '} | Source: ${achatSource}`);

    // Show billing_data.equipment_data if present
    const eq = inv.billing_data?.equipment_data || [];
    if (eq.length) {
      for (const e of eq) {
        console.log(`    → ${(e.title||'?').substring(0,50).padEnd(50)} qty=${e.quantity} pp=${e.purchase_price}`);
      }
    }
    console.log('');

    totalCA += rev;
    totalAchats += achats;
  }

  const totalMarge = totalCA - totalAchats;
  console.log('═'.repeat(80));
  console.log(`TOTAL JANVIER : CA=${totalCA.toFixed(2)}€  Achats=${totalAchats.toFixed(2)}€  Marge=${totalMarge.toFixed(2)}€`);
  console.log(`\nExcel attendu : Achats = 36,257.84€  Marge = 30,921.05€`);
  console.log(`Écart achats  : ${(totalAchats - 36257.84).toFixed(2)}€`);

  // Also check if 180-17880 / ITC-2023-005 exists at all (with or without company_id)
  console.log('\n─── Recherche ITC-2023-005 (Dav Constructance) sans filtre company_id ───');
  const { data: dav } = await sb.from('invoices')
    .select('id, invoice_number, invoice_date, amount, contract_id, billing_data, company_id')
    .ilike('invoice_number', '%ITC-2023-005%');

  if (!dav?.length) {
    // Try by dossier
    const { data: offers } = await sb.from('offers').select('id, dossier_number').eq('dossier_number', '180-17880');
    console.log('  Par dossier 180-17880:', offers?.length ? JSON.stringify(offers) : 'INTROUVABLE');
  } else {
    for (const d of dav) {
      console.log(`  ${d.invoice_number} | amount=${d.amount}€ | company_id=${d.company_id?.substring(0,8)||'NULL'} | contract_id=${d.contract_id?.substring(0,8)||'NULL'}`);
      const eq = d.billing_data?.equipment_data || [];
      console.log(`  billing_data.equipment_data: ${eq.length} items, total=${eq.reduce((s,e)=>(parseFloat(e.purchase_price)||0)*(parseFloat(e.quantity)||1)+s,0).toFixed(2)}€`);
    }
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
