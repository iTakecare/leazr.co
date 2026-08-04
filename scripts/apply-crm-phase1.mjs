/**
 * apply-crm-phase1.mjs
 * CRM Acquisition — Phase 1 : socle de données (pipeline_stages, contacts,
 * opportunities, crm_activities) + backfill de l'existant + projections.
 *
 * Le backfill est lourd (une opportunité par offre, projection de tout
 * l'historique dans la timeline) : on applique le SQL en une transaction puis
 * on affiche un état des lieux.
 *
 * Usage : node scripts/apply-crm-phase1.mjs
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
  join(__dirname, '../supabase/migrations/20260804110000_crm_phase1_opportunities.sql'),
  'utf8'
);

console.log('⏳ Application du socle CRM (backfill inclus, peut prendre 1-2 min)…');
const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec migration CRM Phase 1 :', error.message);
  process.exit(1);
}
console.log('✅ Migration CRM Phase 1 appliquée');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));
console.log('✅ Schéma PostgREST rechargé');

// État des lieux
for (const table of ['pipeline_stages', 'contacts', 'opportunities', 'crm_activities']) {
  const { count, error: e } = await sb.from(table).select('*', { count: 'exact', head: true });
  console.log(e ? `   ${table}: erreur ${e.message}` : `   ${table}: ${count} lignes`);
}

const { count: orphans } = await sb
  .from('offers')
  .select('*', { count: 'exact', head: true })
  .is('opportunity_id', null);
console.log(`   offres sans opportunité : ${orphans ?? '?'} (attendu : 0)`);
