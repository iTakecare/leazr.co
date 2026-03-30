/**
 * diagnose-mm2-march2026.js
 * Cherche le contrat m&m2 et son paiement de mars 2026 manquant
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC M&M2 / MARS 2026\n');

  // 1. Cherche le contrat m&m2 (plusieurs variantes)
  const { data: contracts } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, is_self_leasing, contract_start_date, monthly_payment, status')
    .eq('company_id', COMPANY_ID)
    .or('client_name.ilike.%m%m%,client_name.ilike.%m2%,client_name.ilike.%mm%');

  console.log(`═══ CONTRATS M&M2 (${contracts?.length || 0} trouvés) ═══`);
  contracts?.forEach(c => {
    console.log(`  ${c.contract_number} | ${c.client_name} | self=${c.is_self_leasing} | start=${c.contract_start_date} | ${c.monthly_payment}€ | ${c.status}`);
  });

  // 2. Toutes les factures mars 2026
  console.log('\n═══ FACTURES MARS 2026 ═══');
  const { data: marchInv } = await sb
    .from('invoices')
    .select('invoice_number, invoice_type, integration_type, amount, invoice_date, contract_id')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2026-03-01')
    .lte('invoice_date', '2026-03-31')
    .order('invoice_date');

  marchInv?.forEach(i => {
    console.log(`  ${i.invoice_number.padEnd(25)} ${(i.invoice_type||'').padEnd(12)} ${(i.integration_type||'').padEnd(12)} ${String(i.amount+'€').padStart(10)}  ${i.invoice_date}`);
  });

  // 3. Tous les contrats self-leasing avec leurs factures mars 2026
  console.log('\n═══ SELF-LEASING : FACTURES MARS 2026 PAR CONTRAT ═══');
  const { data: selfContracts } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, monthly_payment, contract_start_date')
    .eq('company_id', COMPANY_ID)
    .eq('is_self_leasing', true);

  for (const c of (selfContracts || [])) {
    if (!c) continue;
    const { data: linked } = await sb
      .from('invoices')
      .select('invoice_number, amount, invoice_date, integration_type, status')
      .eq('company_id', COMPANY_ID)
      .eq('contract_id', c.id)
      .gte('invoice_date', '2026-03-01')
      .lte('invoice_date', '2026-03-31');

    const marker = linked?.length ? '✅' : '❌';
    const num = (c.contract_number || c.id.slice(0,8)).padEnd(22);
    const name = (c.client_name || '?').padEnd(30);
    console.log(`  ${marker} ${num} ${name} ${c.monthly_payment}€/mois | start=${c.contract_start_date}`);
    linked?.forEach(i => console.log(`     → ${i.invoice_number} | ${i.amount}€ | ${i.invoice_date} | ${i.integration_type}`));
  }

  // Tous les self-leasing sans facture en mars
  console.log('\n═══ TOUS CONTRATS SELF-LEASING (pour référence) ═══');
  selfContracts?.forEach(c => {
    const num = c.contract_number || c.id.slice(0,8);
    console.log(`  ${num.padEnd(22)} ${(c.client_name||'?').padEnd(35)} ${c.monthly_payment}€  start=${c.contract_start_date}`);
  });

  // 4. Mollie payments mars 2026 sans contract_id
  console.log('\n═══ PAIEMENTS MOLLIE MARS 2026 (tous) ═══');
  const { data: mollie } = await sb
    .from('invoices')
    .select('invoice_number, amount, invoice_date, contract_id, integration_type')
    .eq('company_id', COMPANY_ID)
    .eq('integration_type', 'mollie')
    .gte('invoice_date', '2026-03-01')
    .lte('invoice_date', '2026-03-31');

  mollie?.forEach(i => {
    console.log(`  ${i.invoice_number.padEnd(25)} ${String(i.amount+'€').padStart(10)}  contract=${i.contract_id?.slice(0,8)||'null'}`);
  });
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
