/**
 * fix-arsg-client-name.js
 *
 * Corrige le nom du client sur tous les contrats et factures ARSG :
 *   "Nicolas Ceron" → client DB : Athénée Royal Saint Ghislain / Xavier Gorskis
 *
 * Usage :
 *   node scripts/fix-arsg-client-name.js          → dry-run
 *   node scripts/fix-arsg-client-name.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const NEW_CLIENT_NAME    = 'Xavier Gorskis';
const NEW_COMPANY_NAME   = 'Athénée Royal Saint Ghislain';

async function main() {
  console.log(`\n🔧 FIX CLIENT ARSG — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  console.log(`  Ancien : Nicolas Ceron`);
  console.log(`  Nouveau : ${NEW_CLIENT_NAME} / ${NEW_COMPANY_NAME}\n`);

  // 1. Chercher le client dans la DB
  const { data: clients } = await sb
    .from('clients')
    .select('id, name, company_name, email')
    .eq('company_id', COMPANY_ID)
    .or('name.ilike.%Xavier Gorskis%,company_name.ilike.%Saint Ghislain%,name.ilike.%Gorskis%');

  console.log('  Clients trouvés dans la DB :');
  clients?.forEach(c => console.log(`    ${c.id} | ${c.name} | ${c.company_name} | ${c.email}`));

  const dbClient = clients?.[0] || null;
  const clientId = dbClient?.id || null;
  const clientName    = dbClient?.name         || NEW_CLIENT_NAME;
  const clientCompany = dbClient?.company_name || NEW_COMPANY_NAME;
  const clientEmail   = dbClient?.email        || '';

  console.log(`\n  → Utilise client_id : ${clientId || '(nouveau — pas de FK mise à jour)'}`);

  // 2. Contrats avec client_name = Nicolas Ceron
  const { data: contracts } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, client_id')
    .eq('company_id', COMPANY_ID)
    .ilike('client_name', '%Nicolas Ceron%');

  console.log(`\n  ${contracts?.length || 0} contrats avec "Nicolas Ceron" :`);
  contracts?.forEach(c => console.log(`    ${c.id.slice(0,8)} | ${c.contract_number || '?'} | ${c.client_name}`));

  // 3. Factures avec billing_data.contract_data.client_name = Nicolas Ceron
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, invoice_number, billing_data')
    .eq('company_id', COMPANY_ID)
    .like('invoice_number', 'ITC-2024-%');

  const arsgInvoices = (invoices || []).filter(inv => {
    const cn = inv.billing_data?.contract_data?.client_name || '';
    return /nicolas.?ceron/i.test(cn);
  });

  console.log(`\n  ${arsgInvoices.length} factures 2024 avec "Nicolas Ceron" dans billing_data :`);
  arsgInvoices.forEach(inv => {
    const cn = inv.billing_data?.contract_data?.client_name;
    console.log(`    ${inv.invoice_number} | client: ${cn}`);
  });

  // 4. Offers
  const { data: offers } = await sb
    .from('offers')
    .select('id, dossier_number, client_name, client_id')
    .eq('company_id', COMPANY_ID)
    .ilike('client_name', '%Nicolas Ceron%');

  console.log(`\n  ${offers?.length || 0} demandes avec "Nicolas Ceron" :`);
  offers?.forEach(o => console.log(`    ${o.id.slice(0,8)} | ${o.dossier_number} | ${o.client_name}`));

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
    return;
  }

  let nDone = 0;

  // 5. Mettre à jour les contrats
  for (const c of (contracts || [])) {
    const upd = { client_name: clientName, updated_at: new Date().toISOString() };
    if (clientId) upd.client_id = clientId;
    const { error } = await sb.from('contracts').update(upd).eq('id', c.id);
    if (error) console.log(`  ❌ Contrat ${c.id.slice(0,8)}: ${error.message}`);
    else { console.log(`  ✅ Contrat ${c.contract_number || c.id.slice(0,8)} → ${clientName}`); nDone++; }
  }

  // 6. Mettre à jour le billing_data des factures
  for (const inv of arsgInvoices) {
    const bd = { ...inv.billing_data };
    if (!bd.contract_data) bd.contract_data = {};
    bd.contract_data.client_name    = clientName;
    bd.contract_data.client_company = clientCompany;
    if (clientEmail) bd.contract_data.client_email = clientEmail;
    const { error } = await sb.from('invoices').update({ billing_data: bd, updated_at: new Date().toISOString() }).eq('id', inv.id);
    if (error) console.log(`  ❌ Facture ${inv.invoice_number}: ${error.message}`);
    else { console.log(`  ✅ Facture ${inv.invoice_number} → ${clientName}`); nDone++; }
  }

  // 7. Mettre à jour les offers
  for (const o of (offers || [])) {
    const upd = { client_name: clientName, updated_at: new Date().toISOString() };
    if (clientId) upd.client_id = clientId;
    const { error } = await sb.from('offers').update(upd).eq('id', o.id);
    if (error) console.log(`  ❌ Offer ${o.dossier_number}: ${error.message}`);
    else { console.log(`  ✅ Offer ${o.dossier_number} → ${clientName}`); nDone++; }
  }

  console.log(`\n  ✅ ${nDone} enregistrements mis à jour\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
