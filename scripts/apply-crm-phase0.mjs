/**
 * apply-crm-phase0.mjs
 * CRM Acquisition — Phase 0 : rattachement des emails IMAP aux clients,
 * colonnes de triage sur contact_submissions, activation des crons de rappel.
 * Substitue <SERVICE_ROLE_KEY> dans le SQL avant application.
 * Usage : node scripts/apply-crm-phase0.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, '../supabase/migrations/20260804100000_crm_phase0.sql'),
  'utf8'
).replaceAll('<SERVICE_ROLE_KEY>', SUPABASE_SERVICE_KEY);

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec migration CRM Phase 0 :', error.message);
  process.exit(1);
}
console.log('✅ Migration CRM Phase 0 appliquée');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));
console.log('✅ Schéma PostgREST rechargé');
