import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://cifbetjefyfocafanlhv.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',{auth:{persistSession:false}});

const {data:inv, error:ie} = await sb.from('invoices')
  .select('contract_id')
  .eq('company_id','c1ce66bb-3ad2-474d-b477-583baa7ff1c0')
  .eq('invoice_type','leasing')
  .gte('invoice_date','2024-01-01')
  .lte('invoice_date','2024-12-31')
  .not('contract_id','is',null);

if (ie) { console.error('Erreur invoices:', ie.message); process.exit(1); }
console.log('Factures leasing 2024 avec contract_id:', inv.length);

const cids = [...new Set(inv.map(i=>i.contract_id))];
console.log('Contrats uniques:', cids.length);

const {data:contracts, error:ce} = await sb.from('contracts')
  .select('id,contract_number,leaser_name,status')
  .in('id', cids);

if (ce) { console.error('Erreur contracts:', ce.message); process.exit(1); }
if (!contracts) { console.log('Aucun contrat trouve (null)'); process.exit(0); }

console.log('Contrats recuperes:', contracts.length);

const withNum    = contracts.filter(c => c.contract_number);
const withoutNum = contracts.filter(c => !c.contract_number);

console.log('\nAvec contract_number   :', withNum.length);
console.log('Sans contract_number   :', withoutNum.length);

if (withNum.length > 0) {
  console.log('\nExemple AVEC numero (3 premiers):');
  for (const c of withNum.slice(0,3)) console.log(' ', JSON.stringify(c));
}

if (withoutNum.length > 0) {
  console.log('\nExemple SANS numero (5 premiers):');
  for (const c of withoutNum.slice(0,5)) console.log(' ', JSON.stringify(c));
}
