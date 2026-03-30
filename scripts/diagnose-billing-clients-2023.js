/**
 * diagnose-billing-clients-2023.js
 *
 * Pour toutes les factures leasing 2023 en DB :
 *  - Affiche le client_name stocké dans billing_data.contract_data
 *  - Compare avec le vrai client via offer → clients
 *  - Signale les écarts et les billing_data manquants
 *
 * Usage: node scripts/diagnose-billing-clients-2023.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 DIAGNOSTIC CLIENTS 2023\n');

  // Toutes les factures 2023
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .like('invoice_number', 'ITC-2023-%')
    .order('invoice_number');

  if (error) { console.error('❌', error.message); return; }

  console.log(`  ${invoices.length} factures ITC-2023-* trouvées\n`);

  // Récupérer tous les offers et clients en une fois
  const offerIds = [...new Set(invoices.filter(i => i.offer_id).map(i => i.offer_id))];
  const { data: offers } = await sb
    .from('offers')
    .select('id, client_id')
    .in('id', offerIds);

  const clientIds = [...new Set((offers||[]).filter(o => o.client_id).map(o => o.client_id))];
  const { data: clients } = await sb
    .from('clients')
    .select('id, name, company, email')
    .in('id', clientIds);

  const offerMap  = Object.fromEntries((offers||[]).map(o => [o.id, o]));
  const clientMap = Object.fromEntries((clients||[]).map(c => [c.id, c]));

  let noBilling = 0, mismatch = 0, ok = 0;
  const mismatches = [];
  const noBillingList = [];

  for (const inv of invoices) {
    const bd = inv.billing_data;

    if (!bd || !bd.contract_data) {
      noBilling++;
      noBillingList.push(inv.invoice_number);
      continue;
    }

    const storedName    = bd.contract_data.client_name    || '';
    const storedCompany = bd.contract_data.client_company || '';
    const storedEmail   = bd.contract_data.client_email   || '';

    // Trouver le vrai client
    const offer  = inv.offer_id ? offerMap[inv.offer_id] : null;
    const client = offer?.client_id ? clientMap[offer.client_id] : null;
    const realName    = client?.name    || '';
    const realCompany = client?.company || '';
    const realEmail   = client?.email   || '';

    const nameOk    = !realName    || storedName.toLowerCase()    === realName.toLowerCase();
    const companyOk = !realCompany || storedCompany.toLowerCase() === realCompany.toLowerCase();

    if (!nameOk || !companyOk) {
      mismatch++;
      mismatches.push({
        invoice:        inv.invoice_number,
        storedName,
        storedCompany,
        realName,
        realCompany,
        realEmail,
        client_id:      client?.id || null,
      });
    } else {
      ok++;
    }
  }

  // ── Résultats ──────────────────────────────────────────────────────────
  console.log(`  ✅ OK                : ${ok}`);
  console.log(`  ⚠️  Écarts client    : ${mismatch}`);
  console.log(`  ❌ Sans billing_data : ${noBilling}\n`);

  if (noBillingList.length) {
    console.log('── Sans billing_data ─────────────────────────────────');
    noBillingList.forEach(n => console.log(`  ${n}`));
    console.log();
  }

  if (mismatches.length) {
    console.log('── Écarts à corriger ─────────────────────────────────');
    for (const m of mismatches) {
      console.log(`\n  ${m.invoice}`);
      console.log(`     Stocké  : "${m.storedName}" / "${m.storedCompany}"`);
      console.log(`     DB réel : "${m.realName}" / "${m.realCompany}" (id=${m.client_id})`);
    }
    console.log();
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
