const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',
  { auth: { persistSession: false } }
);

// Mapping offer_id → contract_start_date
const offerDates = {
  '8bacd60c-7e46-4e75-9e95-9b15cb20cb7b': '2024-01-01',
  'bcb4467a-db17-4d58-be0e-1d709f94deb4': '2024-01-01',
  '0c090b68-6818-4e01-a73e-4d60deba1432': '2024-04-01',
  '5a0c86de-dd91-4a6f-9362-420ac50a338b': '2024-01-01',
  '9d1fe2b3-0c62-4f9e-b7c2-cdd66c3dbcd7': '2024-04-01',
  'c8649f6c-4b85-4928-b5f0-2e0cbaf6b67a': '2024-01-01',
  '2cbbe778-9506-46c8-a57a-465661eab036': '2024-01-01',
  '92b4b2d9-fa08-4236-8b8d-ab295c87c8f9': '2024-04-01',
  '134bcf0e-5fe5-4b54-a36e-e394f1d3c7d2': '2024-10-01',
  '0a178d40-4de0-4b08-9a34-6e63d4e72a79': '2025-01-01',
  'f4468a46-2a52-4dd4-aab6-01bde1f18a23': '2025-01-01',
  'e07f69a5-8f06-498f-9ad1-a6c4218d0624': '2025-01-01',
};

async function fix() {
  // 1. Corriger les dates des offres
  for (const [offerId, date] of Object.entries(offerDates)) {
    const { error } = await sb.from('offers').update({ created_at: date }).eq('id', offerId);
    console.log(`Date ${offerId.slice(0,8)} → ${date}: ${error ? error.message : 'OK'}`);
  }

  // 2. Corriger selling_price = 1.4 (coefficient leasing) → null sur toutes les offres Gorskis
  const offerIds = Object.keys(offerDates);
  for (const offerId of offerIds) {
    const { data, error } = await sb.from('offer_equipment')
      .update({ selling_price: null, margin: null })
      .eq('offer_id', offerId)
      .lte('selling_price', 2); // selling_price <= 2 = clairement un coefficient, pas un prix
    console.log(`Equipment selling_price fix ${offerId.slice(0,8)}: ${error ? error.message : 'OK'}`);
  }

  console.log('\nTerminé!');
}

fix().catch(console.error);
