/**
 * apply-winlease-phase2.mjs
 * Applique la migration Winlease Phase 2 (credit_reports, limites d'encours,
 * reco IA, RPC get_financing_exposure) via la RPC execute_sql.
 * Usage : node scripts/apply-winlease-phase2.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260729140000_winlease_phase2_scoring.sql'), 'utf8');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec migration Phase 2 :', error.message);
  process.exit(1);
}
console.log('✅ Migration Winlease Phase 2 appliquée');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));

const checks = [
  ['credit_reports', sb.from('credit_reports').select('id').limit(1)],
  ['clients.outstanding_limit', sb.from('clients').select('id, outstanding_limit').limit(1)],
  ['financing_partners.outstanding_limit', sb.from('financing_partners').select('id, outstanding_limit').limit(1)],
  ['offers.financing_ai_recommendation', sb.from('offers').select('id, financing_ai_recommendation').limit(1)],
];
for (const [label, q] of checks) {
  const { error: e } = await q;
  console.log(e ? `❌ ${label} : ${e.message}` : `✅ ${label}`);
}

const { data, error: expErr } = await sb.rpc('get_financing_exposure', {
  p_client_id: null,
  p_partner_id: null,
});
// service_role n'a pas de company → on attend l'erreur "Utilisateur sans société"
console.log(`ℹ️ get_financing_exposure → ${expErr ? expErr.message : JSON.stringify(data)}`);
