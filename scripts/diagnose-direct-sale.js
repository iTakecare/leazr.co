/**
 * diagnose-direct-sale.js
 * Inspecte une vente directe existante (ITC-2023-0023) pour comprendre
 * la structure exacte utilisée par l'appli (offer + invoice + offer_equipment).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  // 1. Fetch the reference invoice ITC-2023-0023 (already in DB, working)
  const { data: refInv, error: e1 } = await sb
    .from('invoices')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2023-0023')
    .single();

  if (e1) { console.error('Invoice not found:', e1.message); return; }

  console.log('\n══ INVOICE ITC-2023-0023 (référence) ══');
  console.log(JSON.stringify(refInv, null, 2));

  // 2. Fetch linked offer
  if (refInv.offer_id) {
    const { data: offer } = await sb
      .from('offers')
      .select('*')
      .eq('id', refInv.offer_id)
      .single();
    console.log('\n══ OFFER lié ══');
    console.log(JSON.stringify(offer, null, 2));

    // 3. Fetch offer_equipment
    const { data: eqs } = await sb
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', refInv.offer_id);
    console.log('\n══ OFFER_EQUIPMENT ══');
    console.log(JSON.stringify(eqs, null, 2));
  }

  // 4. Now fetch one of our imported invoices for comparison
  console.log('\n\n══ INVOICE ITC-2023-0009 (importée) ══');
  const { data: ourInv } = await sb
    .from('invoices')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2023-0009')
    .single();
  console.log(JSON.stringify(ourInv, null, 2));

  if (ourInv?.offer_id) {
    const { data: ourOffer } = await sb
      .from('offers')
      .select('*')
      .eq('id', ourInv.offer_id)
      .single();
    console.log('\n══ OFFER lié (importée) ══');
    console.log(JSON.stringify(ourOffer, null, 2));
  }
}

main().catch(e => console.error('💥', e.message));
