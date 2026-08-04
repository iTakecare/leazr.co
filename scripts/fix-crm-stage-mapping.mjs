/**
 * fix-crm-stage-mapping.mjs
 * Recalcule l'étape de pipeline de TOUTES les opportunités issues du backfill,
 * à partir des vrais workflow_status et surtout de converted_to_contract.
 *
 * Idempotent : ne touche que les opportunités dont l'étape change.
 * Usage : node scripts/fix-crm-stage-mapping.mjs
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
      '\n⚠️  Si l\'échec a eu lieu au milieu, les triggers de opportunities peuvent être\n' +
        '   restés désactivés. Relancer ce script les remet en place.'
    );
    process.exit(1);
  }
};

const blocks = readFileSync(
  join(__dirname, '../supabase/migrations/20260804120000_crm_stage_mapping_fix.sql'),
  'utf8'
)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log('⏳ Recalcul des étapes…');
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec bloc ${index + 1}/${blocks.length}`);
}
console.log('✅ Étapes recalculées\n');

// Répartition résultante
const { data: stages } = await sb
  .from('pipeline_stages')
  .select('id, key, label, is_won, is_lost, position')
  .order('position');

console.log('📊 Répartition du pipeline :');
for (const stage of stages ?? []) {
  const { count } = await sb
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
    .eq('stage_id', stage.id);
  if ((count ?? 0) === 0) continue;
  const tag = stage.is_won ? ' (gagné)' : stage.is_lost ? ' (perdu)' : '';
  console.log(`   ${String(count).padStart(5)}  ${stage.label}${tag}`);
}

const { count: open } = await sb
  .from('opportunities')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'open');
console.log(`\n   → ${open} affaires réellement en cours dans le pipeline`);
