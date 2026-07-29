/**
 * apply-winlease-phase1-rls.mjs
 * Applique l'isolation RLS des partenaires de financement (zzz_block_financing_partners).
 * Usage : node scripts/apply-winlease-phase1-rls.mjs
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
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260729121000_financing_partner_rls_isolation.sql'), 'utf8');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec isolation RLS partenaires :', error.message);
  process.exit(1);
}
console.log('✅ Isolation RLS partenaires de financement appliquée');

// Compter les policies créées
const { data, error: e2 } = await sb.rpc('execute_sql', {
  sql: `select count(*)::text as n from pg_policies where policyname = 'zzz_block_financing_partners'`,
});
console.log(e2 ? `❌ comptage : ${e2.message}` : `✅ Policies zzz_block_financing_partners : ${JSON.stringify(data)}`);
