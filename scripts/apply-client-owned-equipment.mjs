/**
 * apply-client-owned-equipment.mjs
 * Crée la table public.client_owned_equipment (parc externe client) via la RPC
 * execute_sql, puis recharge le schéma PostgREST.
 * Usage : node scripts/apply-client-owned-equipment.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260721190000_client_owned_equipment.sql'), 'utf8');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec création client_owned_equipment :', error.message);
  process.exit(1);
}
console.log('✅ Table client_owned_equipment créée (RLS + trigger)');

// Recharge le cache de schéma PostgREST pour exposer la table via l'API REST
const { error: notifyErr } = await sb.rpc('execute_sql', { sql: "NOTIFY pgrst, 'reload schema'" });
console.log(notifyErr ? `⚠️ NOTIFY pgrst : ${notifyErr.message}` : '✅ Schéma PostgREST rechargé');

// Test rapide : la table doit répondre via REST
await new Promise((r) => setTimeout(r, 1500));
const { error: testErr } = await sb.from('client_owned_equipment').select('id', { count: 'exact', head: true });
console.log(testErr ? `⚠️ Test REST : ${testErr.message} (réessaie dans ~1 min si cache pas encore rechargé)` : '✅ Table accessible via REST');
