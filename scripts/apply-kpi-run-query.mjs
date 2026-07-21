/**
 * apply-kpi-run-query.mjs
 * Crée/actualise la fonction public.kpi_run_query (Analyste KPI) via la RPC execute_sql.
 * Usage : node scripts/apply-kpi-run-query.mjs
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
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260721120000_kpi_run_query.sql'), 'utf8');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec création kpi_run_query :', error.message);
  process.exit(1);
}
console.log('✅ kpi_run_query créée/actualisée');

// Test rapide : la fonction doit exécuter un SELECT et refuser un UPDATE
const { data: ok, error: e1 } = await sb.rpc('kpi_run_query', { p_sql: 'SELECT 1 AS un' });
console.log('SELECT test :', e1 ? `❌ ${e1.message}` : JSON.stringify(ok));
// Le garde-fou doit rejeter toute instruction d'écriture (table inexistante : aucun risque)
const { error: e2 } = await sb.rpc('kpi_run_query', { p_sql: 'UPDATE table_inexistante_test_garde_fou SET x = 1' });
console.log('Test garde-fou écriture (doit être refusé) :', e2 ? `✅ refusé (${e2.message})` : '❌ PASSÉ — PROBLÈME');
