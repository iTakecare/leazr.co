/**
 * apply-crm-phase4.mjs
 * CRM Acquisition — Phase 4 : moteur de séquences multi-canal.
 * Substitue <SERVICE_ROLE_KEY> (authentification du cron du dispatcher).
 *
 * Idempotent. Usage : node scripts/apply-crm-phase4.mjs
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

const run = async (sql, label) => {
  const { error } = await sb.rpc('execute_sql', { sql });
  if (error) {
    console.error(`❌ ${label} :`, error.message);
    process.exit(1);
  }
};

const blocks = readFileSync(
  join(__dirname, '../supabase/migrations/20260804150000_crm_phase4_sequences.sql'),
  'utf8'
)
  .replaceAll('<SERVICE_ROLE_KEY>', SUPABASE_SERVICE_KEY)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log(`⏳ Application Phase 4 (${blocks.length} blocs)…`);
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec bloc ${index + 1}/${blocks.length}`);
  process.stdout.write(`\r   bloc ${index + 1}/${blocks.length}`);
}
console.log('\n✅ Phase 4 appliquée');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));

for (const table of ['sequences', 'sequence_steps', 'sequence_enrollments']) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  console.log(error ? `   ${table} : erreur ${error.message}` : `   ${table} : ${count} lignes`);
}

console.log(
  "\n   Le cron `sequence-dispatch` tourne toutes les 5 min mais n'enverra rien\n" +
    "   tant qu'aucune séquence n'est passée en statut « active »."
);
