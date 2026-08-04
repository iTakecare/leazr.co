/**
 * apply-crm-docs-stage.mjs
 * Ajoute l'étape « En attente de documents », y bascule les dossiers concernés,
 * et requalifie les affaires « sans suite » (motif no_response + tag
 * `reactivation` sur celles qui valent encore une relance).
 *
 * Idempotent. Usage : node scripts/apply-crm-docs-stage.mjs
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
    console.error(
      "\n⚠️  Les triggers de opportunities peuvent être restés désactivés.\n" +
        '   Relancer ce script les remet en place.'
    );
    process.exit(1);
  }
};

const blocks = readFileSync(
  join(__dirname, '../supabase/migrations/20260804130000_crm_docs_stage_and_reactivation.sql'),
  'utf8'
)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log(`⏳ Application (${blocks.length} blocs)…`);
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec bloc ${index + 1}/${blocks.length}`);
}
console.log('✅ Appliqué\n');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 2000));

const { data: stages } = await sb
  .from('pipeline_stages')
  .select('id, key, label, is_won, is_lost, probability, position')
  .order('position');

const seen = new Set();
console.log('📊 Pipeline :');
for (const stage of stages ?? []) {
  if (seen.has(stage.key)) continue;
  seen.add(stage.key);
  const { count } = await sb
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
    .in(
      'stage_id',
      (stages ?? []).filter((s) => s.key === stage.key).map((s) => s.id)
    );
  const tag = stage.is_won ? ' (gagné)' : stage.is_lost ? ' (perdu)' : ` — ${stage.probability} %`;
  console.log(`   ${String(count ?? 0).padStart(5)}  ${stage.label}${tag}`);
}

const { count: reactivation } = await sb
  .from('opportunities')
  .select('*', { count: 'exact', head: true })
  .contains('tags', ['reactivation']);
console.log(`\n   ${reactivation ?? 0} affaires taguées « reactivation »`);
