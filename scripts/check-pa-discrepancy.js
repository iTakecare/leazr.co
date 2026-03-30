/**
 * check-pa-discrepancy.js — Comparaison PA DB vs PA CSV (hardcodé)
 * Identifie quel(s) contrat(s) a un PA incorrect en DB.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

// PA de référence par invoice_number (source: 2024-Tableau_1.csv, colonne 14)
const CSV_PA = {
  'ITC-2024-0002': 3783.47,  'ITC-2024-0003': 1724.82,  'ITC-2024-0004': 1112.32,
  'ITC-2024-0005': 4638.80,  'ITC-2024-0006': 1800.00,  'ITC-2024-0007':  700.42,
  'ITC-2024-0009': 1445.01,  'ITC-2024-0010': 6008.71,  'ITC-2024-0011': 1384.00,
  'ITC-2024-0012': 3228.72,  'ITC-2024-0013': 1716.65,  'ITC-2024-0016': 2312.39,
  'ITC-2024-0017':19737.80,  'ITC-2024-0018':18354.00,  'ITC-2024-0019':  670.50,
  'ITC-2024-0020': 1800.00,  'ITC-2024-0021':10652.45,  'ITC-2024-0028': 7141.20,
  'ITC-2024-0029': 1799.13,  'ITC-2024-0030': 4158.95,  'ITC-2024-0031':  899.00,
  'ITC-2024-0033': 1886.15,  'ITC-2024-0035':  665.88,  'ITC-2024-0036':  613.59,
  'ITC-2024-0039': 2592.00,  'ITC-2024-0040': 4036.66,  'ITC-2024-0043':  973.92,
  'ITC-2024-0044':  597.00,  'ITC-2024-0045':  875.00,  'ITC-2024-0049': 2425.66,
  'ITC-2024-0050': 1398.76,  'ITC-2024-0055': 2163.82,  'ITC-2024-0056': 2572.23,
  'ITC-2024-0057': 9230.88,  'ITC-2024-0063': 2470.00,  'ITC-2024-0064':  880.00,
  'ITC-2024-0068':  632.16,  'ITC-2024-0070': 6018.50,  'ITC-2024-0071':  696.00,
  'ITC-2024-0073': 2094.00,  'ITC-2024-0074':  442.00,  'ITC-2024-0080': 1391.65,
  'ITC-2024-0081': 1099.00,  'ITC-2024-0082':  742.14,  'ITC-2024-0083': 2071.00,
  'ITC-2024-0084': 3107.44,  'ITC-2024-0085': 1599.65,  'ITC-2024-0086':  575.00,
  'ITC-2024-0089': 1361.64,  'ITC-2024-0090': 2840.57,  'ITC-2024-0104': 1110.00,
  'ITC-2024-0108': 1171.00,  'ITC-2024-0109':  824.79,  'ITC-2024-0110': 1494.00,
  'ITC-2024-0111': 5150.01,  'ITC-2024-0112': 1847.00,  'ITC-2024-0114':15021.52,
  'ITC-2024-0115': 2340.00,  'ITC-2024-0117': 3358.16,  'ITC-2024-0121': 1167.00,
  'ITC-2014-0116': 2767.36,
};

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 COMPARAISON PA DB vs CSV\n');

  const { data: invoices } = await sb
    .from('invoices')
    .select('invoice_number, contract_id, amount, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2024-12-31')
    .not('contract_id', 'is', null);

  const contractIds = [...new Set(invoices.map(i => i.contract_id))];
  const { data: ceRows } = await sb
    .from('contract_equipment')
    .select('contract_id, purchase_price, quantity')
    .in('contract_id', contractIds);

  const paByContract = new Map();
  for (const ce of (ceRows || [])) {
    const prev = paByContract.get(ce.contract_id) || 0;
    paByContract.set(ce.contract_id, prev + (ce.purchase_price || 0) * (ce.quantity || 1));
  }

  let totalDB = 0, totalCSV = 0, nDiscrepancies = 0;
  const rows = invoices.map(inv => ({
    invoice_number: inv.invoice_number,
    client: inv.billing_data?.contract_data?.client_name || inv.billing_data?.client_name || '?',
    paDB: paByContract.get(inv.contract_id) || 0,
    paCSV: CSV_PA[inv.invoice_number] ?? null,
  })).sort((a,b) => a.invoice_number.localeCompare(b.invoice_number));

  console.log(`${'Invoice'.padEnd(20)} | ${'PA DB'.padStart(10)} | ${'PA CSV'.padStart(10)} | ${'Écart'.padStart(8)} | Client`);
  console.log('─'.repeat(95));

  for (const r of rows) {
    totalDB += r.paDB;
    const ecart = r.paCSV !== null ? r.paDB - r.paCSV : null;
    if (r.paCSV !== null) totalCSV += r.paCSV;
    const flag = ecart !== null && Math.abs(ecart) > 0.01 ? ' ❌' : '';
    if (flag) nDiscrepancies++;
    console.log(`${r.invoice_number.padEnd(20)} | ${r.paDB.toFixed(2).padStart(10)} | ${r.paCSV !== null ? r.paCSV.toFixed(2).padStart(10) : '       N/A'} | ${ecart !== null ? ecart.toFixed(2).padStart(8) : '     N/A'} | ${r.client}${flag}`);
  }

  console.log('─'.repeat(95));
  console.log(`${'TOTAL'.padEnd(20)} | ${totalDB.toFixed(2).padStart(10)} | ${totalCSV.toFixed(2).padStart(10)} | ${(totalDB-totalCSV).toFixed(2).padStart(8)}`);
  console.log(`\n  ❌ Discordances : ${nDiscrepancies}`);
  console.log(`  PA DB          : ${totalDB.toFixed(2)}€`);
  console.log(`  PA CSV (réf)   : ${totalCSV.toFixed(2)}€  (global: 189,371.48€)`);
  console.log(`  Écart total    : +${(totalDB - 189371.48).toFixed(2)}€\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
