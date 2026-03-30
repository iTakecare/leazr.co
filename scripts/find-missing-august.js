/**
 * find-missing-august.js
 *
 * Cherche la facture manquante d'août 2024 (~1 756,87 €)
 * - Inspecte les numéros ITC-2024-007x et 008x dans toutes les tables
 * - Cherche aussi les factures non-leasing autour d'août 2024
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 RECHERCHE FACTURE MANQUANTE AOÛT 2024\n');

  // 1. Toutes les factures ITC-2024-007x et ITC-2024-008x (toutes invoice_type)
  const { data: all, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, invoice_type, integration_type, billing_data')
    .eq('company_id', COMPANY_ID)
    .or('invoice_number.like.ITC-2024-007%,invoice_number.like.ITC-2024-008%')
    .order('invoice_number');

  if (error) { console.error('❌', error.message); return; }

  console.log('═══ TOUTES LES FACTURES ITC-2024-007x / 008x ═══\n');
  for (const inv of (all || [])) {
    const client = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client?.name
      || '?';
    const flag = inv.invoice_type !== 'leasing' || inv.integration_type === 'mollie' ? ' ⚠️' : '';
    console.log(`  ${(inv.invoice_number||'?').padEnd(22)} | ${inv.invoice_date} | ${String(inv.amount||0).padStart(10)}€ | ${inv.invoice_type}/${inv.integration_type} | ${client}${flag}`);
  }

  // 2. Cherche les invoices autour d'août 2024 avec ~1756€
  console.log('\n═══ FACTURES AVEC MONTANT PROCHE DE 1 756,87 € ═══\n');
  const { data: approx } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, invoice_type, integration_type, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('amount', 1700)
    .lte('amount', 1850)
    .gte('invoice_date', '2024-06-01')
    .lte('invoice_date', '2024-12-31')
    .order('invoice_date');

  for (const inv of (approx || [])) {
    const client = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client?.name
      || '?';
    console.log(`  ${(inv.invoice_number||'?').padEnd(22)} | ${inv.invoice_date} | ${inv.amount}€ | ${inv.invoice_type}/${inv.integration_type} | ${client}`);
  }

  // 3. Factures août 2024 TOUTES invoice_type (y compris direct sales)
  console.log('\n═══ TOUTES FACTURES AOÛT 2024 (tout type) ═══\n');
  const { data: allAug } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, invoice_type, integration_type, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2024-08-01')
    .lte('invoice_date', '2024-08-31')
    .order('invoice_number');

  let totalAug = 0;
  for (const inv of (allAug || [])) {
    const client = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client?.name
      || '?';
    console.log(`  ${(inv.invoice_number||'?').padEnd(22)} | ${inv.invoice_date} | ${inv.amount}€ | ${inv.invoice_type}/${inv.integration_type} | ${client}`);
    totalAug += inv.amount || 0;
  }
  console.log(`\n  TOTAL toutes factures août : ${totalAug.toFixed(2)} €\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
