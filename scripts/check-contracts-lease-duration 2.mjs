/**
 * check-contracts-lease-duration.mjs — vérifie si contracts.lease_duration existe en prod.
 * Usage : node scripts/check-contracts-lease-duration.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

for (const col of ['lease_duration', 'contract_duration']) {
  const { error } = await sb.from('contracts').select(`id, ${col}`).limit(1);
  console.log(error ? `❌ contracts.${col} : ${error.message}` : `✅ contracts.${col} existe`);
}
