import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',
  { auth: { persistSession: false } }
);

const fixes = [
  { id: '8bacd60c-94d5-44be-92b1-db1011d5f1ef', date: '2024-01-01' }, // 180-20346
  { id: '0c090b68-b99f-4207-95d2-d7cf60cc433e', date: '2024-04-01' }, // 180-20348
  { id: '9d1fe2b3-0278-42a9-bc93-678e3992caea', date: '2024-04-01' }, // 180-20361
  { id: 'c8649f6c-56d0-4afd-b2f1-6f91fce339cd', date: '2024-01-01' }, // 180-20362
  { id: '134bcf0e-d801-4211-992c-a91003f09e25', date: '2024-10-01' }, // 180-23618
  { id: '0a178d40-f6c2-4155-a87a-62d83a0f101b', date: '2025-01-01' }, // 180-25576
  { id: 'f4468a46-c7eb-4a65-80d0-7e62288d64e4', date: '2025-01-01' }, // 180-25827
  { id: 'e07f69a5-5435-45c1-8edc-848269f50db3', date: '2025-01-01' }, // 180-25828
];

for (const { id, date } of fixes) {
  // Fix date
  const { error: e1 } = await sb.from('offers').update({ created_at: date }).eq('id', id);
  console.log(`Date ${id.slice(0,8)} → ${date}: ${e1 ? e1.message : 'OK'}`);

  // Fix selling_price (coefficient 1.40 importé comme PV)
  const { error: e2 } = await sb.from('offer_equipment')
    .update({ selling_price: null })
    .eq('offer_id', id)
    .lte('selling_price', 2);
  console.log(`  PV fix: ${e2 ? e2.message : 'OK'}`);
}

console.log('\nDone!');
