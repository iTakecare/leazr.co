/**
 * Cherche tout ce qui concerne le dossier 180-22627 en DB
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',
  { auth: { persistSession: false } }
);
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

console.log('🔍 Recherche dossier 180-22627\n');

// 1. Contracts — tous les champs texte
const { data: contracts } = await sb.from('contracts')
  .select('id, status, leaser_contract_id, leasing_amount, created_at, offer_id')
  .eq('company_id', COMPANY_ID);

const matched = contracts?.filter(c =>
  JSON.stringify(c).includes('22627')
);
if (matched?.length) {
  console.log('Contrats trouvés :');
  for (const c of matched) {
    console.log(`  id=${c.id} leaser_id=${c.leaser_contract_id} amount=${c.leasing_amount}`);
    const { data: invs } = await sb.from('invoices')
      .select('id, invoice_number, amount').eq('contract_id', c.id);
    invs?.forEach(i => console.log(`    → facture: ${i.invoice_number} amount=${i.amount}`));
    if (c.offer_id) {
      const { data: o } = await sb.from('offers').select('id, client_id, amount, remarks').eq('id', c.offer_id).single();
      if (o) {
        console.log(`    → offer: ${o.id} amount=${o.amount} client=${o.client_id}`);
        const { data: cl } = await sb.from('clients').select('id, name, company').eq('id', o.client_id).single();
        if (cl) console.log(`    → client: "${cl.name}" / "${cl.company}"`);
      }
    }
  }
} else {
  console.log('❌ Aucun contrat avec "22627"');
}

// 2. Offers — cherche dans remarks et equipment_description
const { data: allOffers } = await sb.from('offers')
  .select('id, status, amount, remarks, equipment_description, client_id')
  .eq('company_id', COMPANY_ID);

const matchedOffers = allOffers?.filter(o =>
  JSON.stringify(o).includes('22627')
);
if (matchedOffers?.length) {
  console.log('\nOffers trouvés :');
  matchedOffers.forEach(o => console.log(`  id=${o.id} amount=${o.amount} remarks="${o.remarks}"`));
} else {
  console.log('❌ Aucun offer avec "22627"');
}

// 3. Cherche l'offer par montant ~3913 et date avril 2024
console.log('\nOffers ~€3913 acceptés 2024 :');
const approx = allOffers?.filter(o =>
  Math.abs((o.amount || 0) - 3913) < 5 && o.status === 'accepted'
);
approx?.forEach(o => console.log(`  id=${o.id} amount=${o.amount} status=${o.status}`));

// 4. Contrats Grenke avec montant ~3913
const grenkeContracts = contracts?.filter(c =>
  Math.abs((c.leasing_amount || 0) - 3913) < 5
);
if (grenkeContracts?.length) {
  console.log('\nContrats montant ~3913 :');
  for (const c of grenkeContracts) {
    console.log(`  id=${c.id} leaser_id=${c.leaser_contract_id} amount=${c.leasing_amount}`);
    if (c.offer_id) {
      const { data: o } = await sb.from('offers').select('id, client_id').eq('id', c.offer_id).single();
      if (o?.client_id) {
        const { data: cl } = await sb.from('clients').select('name, company').eq('id', o.client_id).single();
        if (cl) console.log(`    → client: "${cl.name}" / "${cl.company}"`);
      }
    }
  }
}
