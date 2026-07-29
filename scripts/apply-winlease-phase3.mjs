/**
 * apply-winlease-phase3.mjs
 * Applique la migration Winlease Phase 3 (cérémonies de signature, signataires
 * autorisés, trigger de progression, RPC de contre-signature).
 * Usage : node scripts/apply-winlease-phase3.mjs
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
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260729160000_winlease_phase3_signatures.sql'), 'utf8');

const { error } = await sb.rpc('execute_sql', { sql });
if (error) {
  console.error('❌ Échec migration Phase 3 :', error.message);
  process.exit(1);
}
console.log('✅ Migration Winlease Phase 3 appliquée');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));

const checks = [
  ['authorized_signers', sb.from('authorized_signers').select('id').limit(1)],
  ['signature_ceremonies', sb.from('signature_ceremonies').select('id').limit(1)],
  ['signature_ceremony_signers', sb.from('signature_ceremony_signers').select('id').limit(1)],
  ['offers.financing_signatory', sb.from('offers').select('id, financing_signatory').limit(1)],
];
for (const [label, q] of checks) {
  const { error: e } = await q;
  console.log(e ? `❌ ${label} : ${e.message}` : `✅ ${label}`);
}

const { error: rpcErr } = await sb.rpc('sign_financing_ceremony_step', {
  p_ceremony_id: '00000000-0000-0000-0000-000000000000',
  p_signature_data: 'x',
});
console.log(`ℹ️ sign_financing_ceremony_step → ${rpcErr ? rpcErr.message : 'OK (inattendu)'}`);

const { data: trg, error: trgErr } = await sb.rpc('execute_sql', {
  sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_contract_signature_to_ceremony') THEN RAISE EXCEPTION 'trigger manquant'; END IF; END $$;`,
});
console.log(trgErr ? `❌ trigger : ${trgErr.message}` : '✅ trigger trg_sync_contract_signature_to_ceremony présent');
