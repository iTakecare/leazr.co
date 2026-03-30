/**
 * check-dav-contract.js - Vérifie le statut exact du contrat Dav Constructance
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  // Invoice ITC-2023-005
  const { data: inv } = await sb.from('invoices')
    .select('id, invoice_number, contract_id, company_id, invoice_date, amount')
    .eq('invoice_number', 'ITC-2023-005')
    .maybeSingle();

  console.log(`\nInvoice: ${inv?.invoice_number} | contract_id: ${inv?.contract_id}`);

  if (!inv?.contract_id) { console.log('❌ Pas de contract_id'); return; }

  // Contrat complet
  const { data: c } = await sb.from('contracts')
    .select('id, status, company_id, offer_id, is_self_leasing, contract_start_date, contract_end_date')
    .eq('id', inv.contract_id)
    .maybeSingle();

  console.log(`\nContrat bc0475ea :`);
  console.log(`  status          : "${c?.status}"`);
  console.log(`  company_id      : ${c?.company_id}`);
  console.log(`  offer_id        : ${c?.offer_id}`);
  console.log(`  is_self_leasing : ${c?.is_self_leasing}`);

  // Tous les contrats Dav Constructance (company_id)
  console.log(`\n── Tous les contrats Dav Constructance (recherche par company_id du client) ──`);
  // D'abord, trouver toutes les offres avec dav constructance
  const { data: invs } = await sb.from('invoices')
    .select('id, invoice_number, contract_id, invoice_date, amount')
    .ilike('invoice_number', '%ITC-2023-005%')
    .order('invoice_date');

  for (const i of invs || []) {
    if (!i.contract_id) { console.log(`  ${i.invoice_number}: pas de contract_id`); continue; }
    const { data: cc } = await sb.from('contracts')
      .select('id, status, company_id')
      .eq('id', i.contract_id)
      .maybeSingle();
    console.log(`  ${i.invoice_number} → contract.status = "${cc?.status}" | company_id: ${cc?.company_id?.substring(0,8)||'NULL'}`);
  }

  // Statuts valides dans la SQL function
  const validStatuses = ['signed', 'active', 'delivered', 'completed', 'equipment_ordered'];
  console.log(`\nStatuts valides pour le dashboard : ${validStatuses.join(', ')}`);
  console.log(`Statut actuel Dav Constructance   : "${c?.status}"`);
  console.log(`Est valide ?                       : ${validStatuses.includes(c?.status) ? '✅ OUI' : '❌ NON → achats = 0€ dans dashboard'}`);
}

main().catch(e => console.error('💥', e.message));
