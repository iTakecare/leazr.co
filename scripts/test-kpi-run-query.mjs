/**
 * test-kpi-run-query.mjs
 * Recharge le cache de schéma PostgREST puis teste kpi_run_query (SELECT ok, écriture refusée).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Recharger le cache de schéma PostgREST pour que la RPC soit visible
const { error: notifyErr } = await sb.rpc('execute_sql', { sql: "NOTIFY pgrst, 'reload schema'" });
console.log('Reload schéma PostgREST :', notifyErr ? `❌ ${notifyErr.message}` : '✅ envoyé');
await new Promise((r) => setTimeout(r, 3000));

const { data: ok, error: e1 } = await sb.rpc('kpi_run_query', { p_sql: 'SELECT 1 AS un' });
console.log('SELECT test :', e1 ? `❌ ${e1.message}` : `✅ ${JSON.stringify(ok)}`);

const { error: e2 } = await sb.rpc('kpi_run_query', { p_sql: 'UPDATE table_inexistante_test_garde_fou SET x = 1' });
console.log('Garde-fou écriture (doit être refusé) :', e2 ? `✅ refusé (${e2.message})` : '❌ PASSÉ — PROBLÈME');

const { data: agg, error: e3 } = await sb.rpc('kpi_run_query', {
  p_sql: "SELECT workflow_status, count(*) AS nb FROM offers GROUP BY workflow_status ORDER BY nb DESC",
});
console.log('Test agrégat offers :', e3 ? `❌ ${e3.message}` : `✅ ${JSON.stringify(agg).slice(0, 300)}`);
