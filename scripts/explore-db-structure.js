/**
 * explore-db-structure.js
 * Explore la structure clients en DB pour comprendre le modèle.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔍 EXPLORATION STRUCTURE DB CLIENTS\n');

  // 1. Table clients — colonnes disponibles (sample)
  console.log('── Table: clients ──');
  const { data: clients, error: ce } = await sb
    .from('clients')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .limit(3);
  if (ce) console.log('  ❌', ce.message);
  else {
    const cols = clients?.length ? Object.keys(clients[0]) : [];
    console.log('  Colonnes:', cols.join(', '));
    for (const c of (clients || [])) {
      console.log(`  → id=${c.id} | name=${c.name} | company=${c.company} | email=${c.email || '?'}`);
    }
    console.log(`  Total visible (limit 3 / ${clients?.length})`);
  }

  // 2. Combien de clients au total
  const { count } = await sb.from('clients').select('*', { count: 'exact', head: true }).eq('company_id', COMPANY_ID);
  console.log(`  Total clients: ${count}\n`);

  // 3. Est-ce que les invoices ont un client_id ?
  console.log('── Table: invoices — champ client_id ──');
  const { data: inv1 } = await sb.from('invoices').select('id, invoice_number, client_id, billing_data').eq('company_id', COMPANY_ID).eq('invoice_number', 'ITC-2024-0002').single();
  if (inv1) {
    console.log(`  invoice ITC-2024-0002:`);
    console.log(`    client_id   = ${inv1.client_id ?? '(null)'}`);
    console.log(`    billing_data keys: ${Object.keys(inv1.billing_data || {}).join(', ')}`);
    console.log(`    billing_data.contract_data keys: ${Object.keys(inv1.billing_data?.contract_data || {}).join(', ')}`);
  }

  // 4. Est-ce que offers ont un client_id ?
  console.log('\n── Table: offers — champ client_id ──');
  const { data: off1 } = await sb.from('offers').select('id, client_name, client_id').eq('company_id', COMPANY_ID).limit(3);
  for (const o of (off1 || [])) {
    console.log(`  → client_name="${o.client_name}" | client_id=${o.client_id ?? '(null)'}`);
  }

  // 5. Chercher "Ceron" ou "Athénée" ou "Gorski" dans clients
  console.log('\n── Recherche Nicolas Ceron / Athénée / Gorski ──');
  const { data: searchResults } = await sb
    .from('clients')
    .select('id, name, company, email, phone')
    .eq('company_id', COMPANY_ID)
    .or('name.ilike.%ceron%,name.ilike.%gorski%,company.ilike.%ath%,name.ilike.%nicolas%');
  for (const c of (searchResults || [])) {
    console.log(`  → id=${c.id} | name=${c.name} | company=${c.company} | email=${c.email}`);
  }

  // 6. Chercher quelques clients leasing dans la table clients
  console.log('\n── Recherche clients leasing 2024 en DB ──');
  const names = ['Bastien Heyderickx','Ness Pelgrims','Gregory Ilnicki','Marine Georges',
    'Esteban Arriaga','Helene Rasquin','Salvatore Arrigo','Thibaud de Clerck','Jennyfer Dewolf'];
  for (const n of names) {
    const first = n.split(' ')[0];
    const last = n.split(' ').slice(1).join(' ');
    const { data: found } = await sb
      .from('clients')
      .select('id, name, company, email')
      .eq('company_id', COMPANY_ID)
      .or(`name.ilike.%${first}%,name.ilike.%${last}%,company.ilike.%${last}%`);
    if (found?.length) {
      console.log(`  "${n}" → ${found.map(c => `"${c.name}" (${c.company || 'pas d\'entreprise'})`).join(' | ')}`);
    } else {
      console.log(`  "${n}" → non trouvé`);
    }
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
