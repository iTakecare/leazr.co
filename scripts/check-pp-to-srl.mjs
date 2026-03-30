/**
 * check-pp-to-srl.mjs
 * Affiche tous les contrats DB actifs pour les clients ayant basculé PP→société :
 * Jadin/KJ Consult, Janssens/RM Toiture, Ndudi/COHEA
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const FRAGMENTS = [
  { label: 'Jadin / KJ Consult',     pattern: 'jadin' },
  { label: 'Janssens / RM Toiture',  pattern: 'janssens' },
  { label: 'Ndudi / COHEA',          pattern: 'ndudi' },
  { label: 'Gorskis / Athénée',      pattern: 'gorskis' },
];

for (const { label, pattern } of FRAGMENTS) {
  console.log(`\n══ ${label} ══`);

  // Chercher par client_name
  const { data: byName } = await sb
    .from('contracts')
    .select('id, client_id, client_name, contract_number, status, offer_id, contract_start_date, contract_end_date')
    .eq('company_id', COMPANY_ID)
    .ilike('leaser_name', '%grenke%')
    .ilike('client_name', `%${pattern}%`)
    .order('contract_start_date', { ascending: true });

  // Chercher par company (clients table)
  const { data: matchingClients } = await sb
    .from('clients')
    .select('id, company, first_name, last_name')
    .eq('company_id', COMPANY_ID)
    .ilike('company', `%${pattern}%`);

  const clientIds = (matchingClients || []).map(c => c.id);
  const { data: byCompany } = clientIds.length
    ? await sb
        .from('contracts')
        .select('id, client_id, client_name, contract_number, status, offer_id, contract_start_date, contract_end_date')
        .eq('company_id', COMPANY_ID)
        .ilike('leaser_name', '%grenke%')
        .in('client_id', clientIds)
        .order('contract_start_date', { ascending: true })
    : { data: [] };

  // Fusionner sans doublons
  const seen = new Set();
  const all = [...(byName || []), ...(byCompany || [])].filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  if (!all.length) {
    console.log('  (aucun contrat Grenke trouvé)');
    continue;
  }

  for (const c of all) {
    const { data: offer } = c.offer_id
      ? await sb.from('offers').select('financed_amount').eq('id', c.offer_id).single()
      : { data: null };
    const fa = offer?.financed_amount != null ? Number(offer.financed_amount).toFixed(2) : 'N/A';
    const status = c.status === 'cancelled' ? '❌cancelled' : '✅';
    console.log(`  ${status} ${c.id.substring(0,8)}… | client="${c.client_name}" | contract_no=${c.contract_number || '—'} | FA=${fa}€ | ${c.contract_start_date || '?'} → ${c.contract_end_date || '?'}`);
  }
}
