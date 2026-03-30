/**
 * diagnose-2025-issues.js
 *
 * Diagnostique deux problèmes sur le dashboard 2025 :
 *   1. ITC-2025-0050 (UNDERSIDE SRL 3916€) compté en vente directe au lieu de leasing
 *   2. Self-leasing 131.85€/mois en oct/nov/déc 2025 (devrait être 0 avant fév 2026)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC 2025 ISSUES\n');

  // ── 1. ITC-2025-0050 ──────────────────────────────────────────────────────
  console.log('═══ ITC-2025-0050 ═══');
  const { data: inv0050, error: e1 } = await sb
    .from('invoices')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2025-0050')
    .maybeSingle();

  if (e1) console.error('❌', e1.message);
  else if (!inv0050) console.log('  ❌ ITC-2025-0050 introuvable');
  else {
    console.log(`  id               : ${inv0050.id}`);
    console.log(`  invoice_type     : ${inv0050.invoice_type}`);
    console.log(`  integration_type : ${inv0050.integration_type}`);
    console.log(`  amount           : ${inv0050.amount}€`);
    console.log(`  leaser_name      : ${inv0050.leaser_name}`);
    console.log(`  offer_id         : ${inv0050.offer_id}`);
    console.log(`  contract_id      : ${inv0050.contract_id}`);
    console.log(`  billing_data     : ${JSON.stringify(inv0050.billing_data?.contract_data || inv0050.billing_data?.client_data || {})}`);
  }

  // ── 2. Factures nov 2025 complètes ────────────────────────────────────────
  console.log('\n═══ TOUTES LES FACTURES NOV 2025 ═══');
  const { data: nov } = await sb
    .from('invoices')
    .select('invoice_number, invoice_type, integration_type, amount, leaser_name')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2025-11-01')
    .lte('invoice_date', '2025-11-30')
    .order('invoice_date');

  let totalLeasing = 0, totalDirect = 0;
  nov?.forEach(i => {
    const amt = parseFloat(i.amount) || 0;
    const tag = i.integration_type === 'leasing' ? 'LEASING' : i.invoice_type === 'purchase' ? 'DIRECT' : i.invoice_type;
    if (i.integration_type === 'leasing') totalLeasing += amt;
    else totalDirect += amt;
    console.log(`  ${i.invoice_number.padEnd(18)} type=${i.invoice_type.padEnd(10)} integ=${(i.integration_type||'null').padEnd(10)} ${String(amt+'€').padStart(10)}  [${tag}]`);
  });
  console.log(`\n  Total leasing : ${totalLeasing.toFixed(2)}€  (attendu: 21,277.46€)`);
  console.log(`  Total direct  : ${totalDirect.toFixed(2)}€`);

  // ── 3. Self-leasing : contrats avec is_self_leasing=true ──────────────────
  console.log('\n═══ CONTRATS SELF-LEASING ═══');
  const { data: selfLeasing, error: e3 } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, is_self_leasing, contract_start_date, contract_end_date, monthly_payment, status')
    .eq('company_id', COMPANY_ID)
    .eq('is_self_leasing', true);

  if (e3) console.error('❌', e3.message);
  else if (!selfLeasing?.length) console.log('  Aucun contrat self-leasing trouvé');
  else {
    selfLeasing.forEach(c => {
      console.log(`  ${c.contract_number || c.id.slice(0,8)} | ${c.client_name} | start=${c.contract_start_date} | monthly=${c.monthly_payment}€ | status=${c.status}`);
    });
  }

  // ── 4. Factures avec integration_type = 'self_leasing' ou similaire ───────
  console.log('\n═══ FACTURES SELF-LEASING 2025 ═══');
  const { data: selfInv } = await sb
    .from('invoices')
    .select('invoice_number, invoice_type, integration_type, amount, invoice_date')
    .eq('company_id', COMPANY_ID)
    .ilike('integration_type', '%self%')
    .gte('invoice_date', '2025-01-01')
    .lte('invoice_date', '2025-12-31');

  if (!selfInv?.length) {
    console.log('  Aucune facture avec integration_type self-leasing');
    // Cherche autrement — via contracts self-leasing et leurs factures
    if (selfLeasing?.length) {
      for (const c of selfLeasing) {
        const { data: linked } = await sb
          .from('invoices')
          .select('invoice_number, amount, invoice_date, integration_type, invoice_type')
          .eq('company_id', COMPANY_ID)
          .eq('contract_id', c.id);
        if (linked?.length) {
          console.log(`  Contrat ${c.contract_number} :`);
          linked.forEach(i => console.log(`    ${i.invoice_number} | ${i.amount}€ | ${i.invoice_date} | ${i.integration_type}`));
        }
      }
    }
  } else {
    selfInv.forEach(i => console.log(`  ${i.invoice_number} | ${i.amount}€ | ${i.invoice_date} | ${i.integration_type}`));
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
