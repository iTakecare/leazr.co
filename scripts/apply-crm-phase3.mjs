/**
 * apply-crm-phase3.mjs
 * CRM Acquisition — Phase 3 : alimentation continue du pipeline (trigger sur
 * offers) + table raw_leads + reprise des formulaires du site + fonction de
 * qualification.
 *
 * Idempotent. Usage : node scripts/apply-crm-phase3.mjs
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
  join(__dirname, '../supabase/migrations/20260804140000_crm_phase3_leads.sql'),
  'utf8'
)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log(`⏳ Application Phase 3 (${blocks.length} blocs)…`);
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec bloc ${index + 1}/${blocks.length}`);
  process.stdout.write(`\r   bloc ${index + 1}/${blocks.length}`);
}
console.log('\n✅ Phase 3 appliquée');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));

const { count: leads } = await sb.from('raw_leads').select('*', { count: 'exact', head: true });
const { count: pendingLeads } = await sb
  .from('raw_leads')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'new');
console.log(`\n📊 raw_leads : ${leads ?? 0} lignes, dont ${pendingLeads ?? 0} à qualifier`);

const { count: orphanOffers } = await sb
  .from('offers')
  .select('*', { count: 'exact', head: true })
  .is('opportunity_id', null);
console.log(`   offres sans opportunité : ${orphanOffers ?? '?'}`);
console.log(
  '\n   À partir de maintenant, toute nouvelle demande crée ou rejoint une opportunité.'
);
