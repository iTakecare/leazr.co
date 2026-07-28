/**
 * apply-commission-reduced-margin.mjs
 * Applique la migration du mode de barème « Marge réduite + forfait par PC »
 * (colonne margin_rate + contrainte calculation_mode) via la RPC execute_sql.
 * Usage : node scripts/apply-commission-reduced-margin.mjs
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
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260728160000_commission_mode_reduced_margin_per_pc.sql'), 'utf8');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec migration margin_rate :', error.message);
  process.exit(1);
}
console.log('✅ Migration appliquée : margin_rate + mode fixed_per_pc_reduced_margin');

// Vérification : la colonne existe et la contrainte accepte le nouveau mode
const { data, error: e1 } = await sb.from('commission_levels').select('id, name, calculation_mode, margin_rate').limit(3);
console.log('Lecture test :', e1 ? `❌ ${e1.message}` : `✅ ${data.length} barèmes lus (margin_rate présent)`);
