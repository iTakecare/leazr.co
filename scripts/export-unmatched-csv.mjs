/**
 * export-unmatched-csv.mjs
 * Exporte les contrats DB Grenke sans numéro de contrat Grenke matchable
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const GRENKE = JSON.parse(readFileSync(join(__dir, 'grenke-data.json'), 'utf8'));
const grenkeNos = new Set(GRENKE.map(g => g.grenke_contract_no));

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const { data: contracts } = await sb
  .from('contracts')
  .select('id, client_id, client_name, contract_number, status, offer_id, contract_start_date, contract_end_date, contract_duration')
  .eq('company_id', COMPANY_ID)
  .ilike('leaser_name', '%grenke%')
  .neq('status', 'cancelled');

const offerIds = contracts.map(c => c.offer_id).filter(Boolean);
const { data: offers } = offerIds.length
  ? await sb.from('offers').select('id, financed_amount').in('id', offerIds)
  : { data: [] };
const offerMap = new Map((offers||[]).map(o => [o.id, o.financed_amount]));

const clientIds = [...new Set(contracts.map(c => c.client_id).filter(Boolean))];
const { data: clients } = clientIds.length
  ? await sb.from('clients').select('id, company').in('id', clientIds)
  : { data: [] };
const clientMap = new Map((clients||[]).map(c => [c.id, c.company||'']));

// Contrats sans numéro Grenke valide
const unmatched = contracts.filter(c => !c.contract_number || !grenkeNos.has(c.contract_number));

const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';

const rows = ['client_name,company_name,financed_amount_db,contract_number_db,status,start_date,end_date,grenke_no_a_assigner,remarque'];
for (const c of unmatched.sort((a,b) => a.client_name.localeCompare(b.client_name))) {
  const fa = offerMap.get(c.offer_id);
  const co = clientMap.get(c.client_id) || '';
  rows.push([
    c.client_name,
    co,
    fa != null ? Number(fa).toFixed(2) : '',
    c.contract_number || '',
    c.status,
    c.contract_start_date || '',
    c.contract_end_date || '',
    '',  // à remplir par l'utilisateur
    ''   // remarque
  ].map(esc).join(','));
}

const outPath = join(__dir, '../grenke-unmatched.csv');
writeFileSync(outPath, rows.join('\n'), 'utf8');
console.log(`✅ ${unmatched.length} contrats exportés → grenke-unmatched.csv`);
