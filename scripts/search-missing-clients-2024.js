/**
 * search-missing-clients-2024.js
 * Cherche en DB les 11 clients sans client_id pour les factures 2024
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const CASES = [
  // [invoice_number, billing_name, search_terms...]
  ['ITC-2024-0002', 'Bastien Heyderickx',               'Apik', 'Heynderickx', 'Bastien'],
  ['ITC-2024-0003', 'Ness Pelgrims',                     'Ness', 'Pelgrims'],
  ['ITC-2024-0010', 'Nicolas Ceron',                     'Gorski', 'Athénée', 'Saint Ghislain', 'AR Saint'],
  ['ITC-2024-0017', 'Nicolas Ceron',                     'Gorski', 'Athénée', 'Saint Ghislain', 'AR Saint'],
  ['ITC-2024-0018', 'Nicolas Ceron',                     'Gorski', 'Athénée', 'Saint Ghislain', 'AR Saint'],
  ['ITC-2024-0080', 'Juan Schmitz',                      'Juan', 'Schmitz'],
  ['ITC-2024-0081', 'Antoine Sottiaux',                  'Antoine', 'Sottiaux'],
  ['ITC-2024-0082', 'Jean-Francois Verlinden',           'Jean', 'Verlinden', 'François'],
  ['ITC-2024-0090', 'Hubert Halbrecq',                   'Hubert', 'Halbrecq'],
  ['ITC-2024-0104', 'Davy Loomans - JNS Lightning',     'Loomans', 'Davy', 'JNS'],
  ['ITC-2024-0109', 'Gregory Ilnicki - Infra Route SRL','Infra Route', 'Ilnicki', 'Gregory'],
];

async function search(terms) {
  const filters = terms.flatMap(t => [
    `name.ilike.%${t}%`,
    `company.ilike.%${t}%`,
  ]).join(',');

  const { data } = await sb
    .from('clients')
    .select('id, name, company, email, first_name, last_name')
    .eq('company_id', COMPANY_ID)
    .or(filters)
    .limit(6);
  return data || [];
}

async function main() {
  console.log('\n🔍 RECHERCHE CLIENTS MANQUANTS 2024\n');

  for (const [inv, billing, ...terms] of CASES) {
    console.log(`\n📄 ${inv} — billing_data: "${billing}"`);
    const results = await search(terms);
    if (!results.length) {
      console.log(`   ❌ Aucun résultat pour: ${terms.join(', ')}`);
    } else {
      for (const c of results) {
        const name = c.name || `${c.first_name||''} ${c.last_name||''}`.trim();
        console.log(`   → id: ${c.id}`);
        console.log(`     name:    "${name}"`);
        console.log(`     company: "${c.company || ''}"`);
        console.log(`     email:   "${c.email || ''}"`);
      }
    }
  }

  // Aussi chercher l'offer de 0081 pour voir ce qu'il a
  console.log('\n\n── Offer de ITC-2024-0081 ──');
  const { data: inv81 } = await sb
    .from('invoices')
    .select('id, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2024-0081')
    .single();
  console.log('  offer_id    :', inv81?.offer_id || '(null)');
  console.log('  contract_id :', inv81?.contract_id || '(null)');
  console.log('  client_name :', inv81?.billing_data?.contract_data?.client_name || inv81?.billing_data?.client_name || '?');

  if (inv81?.contract_id) {
    const { data: contract } = await sb
      .from('contracts')
      .select('id, offer_id, user_id')
      .eq('id', inv81.contract_id)
      .single();
    if (contract?.offer_id) {
      const { data: offer } = await sb
        .from('offers')
        .select('id, client_id, client_name')
        .eq('id', contract.offer_id)
        .single();
      console.log('  offer via contract:', offer?.client_name, '| client_id:', offer?.client_id || '(null)');
      if (offer?.client_id) {
        const { data: client } = await sb
          .from('clients')
          .select('id, name, company')
          .eq('id', offer.client_id)
          .single();
        console.log('  client DB:', client?.name, '|', client?.company);
      }
    }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
