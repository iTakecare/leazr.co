/**
 * apply-winlease-phase1.mjs
 * Applique la migration Winlease Phase 1 (rôle financeur, financing_partners,
 * coefficient_grids, RPC create_financing_request) via la RPC execute_sql.
 * Usage : node scripts/apply-winlease-phase1.mjs
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
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260729120000_winlease_financeur_phase1.sql'), 'utf8');

// L'ajout d'une valeur d'enum doit être committé avant que le reste du SQL
// puisse s'exécuter sans risque : on l'applique dans un premier appel séparé.
const enumSql = `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'financeur'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'financeur';
  END IF;
END $$;`;

const { error: enumError } = await sb.rpc('execute_sql', { sql: enumSql });
if (enumError) {
  console.error('❌ Échec ajout enum financeur :', enumError.message);
  process.exit(1);
}
console.log('✅ Enum app_role.financeur OK');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec migration Winlease Phase 1 :', error.message);
  process.exit(1);
}
console.log('✅ Migration Winlease Phase 1 appliquée');

// Vérifications
const checks = [
  ['financing_partners', sb.from('financing_partners').select('id').limit(1)],
  ['coefficient_grids', sb.from('coefficient_grids').select('id').limit(1)],
  ['coefficient_grid_ranges', sb.from('coefficient_grid_ranges').select('id').limit(1)],
  ['offers.financing_partner_id', sb.from('offers').select('id, financing_partner_id').limit(1)],
  ['clients.financing_partner_id', sb.from('clients').select('id, financing_partner_id').limit(1)],
];
for (const [label, q] of checks) {
  const { error: e } = await q;
  console.log(e ? `❌ ${label} : ${e.message}` : `✅ ${label}`);
}

// Recharger le cache de schéma PostgREST (piège connu) AVANT de tester les RPC
await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
console.log("✅ NOTIFY pgrst reload schema envoyé");
await new Promise((r) => setTimeout(r, 3000));

// Vérifier les RPC
const { data: slugData, error: slugErr } = await sb.rpc('get_financeur_by_slug', { financeur_slug: '___nope___' });
console.log(slugErr ? `❌ get_financeur_by_slug : ${slugErr.message}` : `✅ get_financeur_by_slug (rows: ${slugData?.length ?? 0})`);

// service_role n'est pas un partenaire : on attend l'erreur "aucun partenaire actif"
const { error: reqErr } = await sb.rpc('create_financing_request', {
  p_client: {},
  p_equipment: [],
  p_duration: 36,
});
console.log(`ℹ️ create_financing_request → ${reqErr ? reqErr.message : 'OK (inattendu)'}`);

// Y a-t-il des profils role='partner' existants (impact redirection login) ?
const { data: partnerProfiles, error: pErr } = await sb
  .from('profiles')
  .select('id, email, role')
  .eq('role', 'partner');
console.log(pErr ? `❌ profils partner : ${pErr.message}` : `ℹ️ Profils role=partner existants : ${partnerProfiles.length}`);
