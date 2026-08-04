/**
 * apply-signature-certificate.mjs
 * Certificat de signature électronique : colonnes probantes sur offers +
 * extension de la RPC sign_offer_public.
 *
 * Idempotent. Usage : node scripts/apply-signature-certificate.mjs
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
  join(__dirname, '../supabase/migrations/20260804160000_offer_signature_certificate.sql'),
  'utf8'
)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log(`⏳ Application (${blocks.length} blocs)…`);
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec bloc ${index + 1}/${blocks.length}`);
}
console.log('✅ Appliqué');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));
console.log('✅ Schéma PostgREST rechargé');

const { data } = await sb
  .from('offers')
  .select('dossier_number, signed_at, signer_name, signer_ip, signature_certificate_id')
  .not('signed_at', 'is', null)
  .order('signed_at', { ascending: false })
  .limit(5);

console.log('\n📊 Offres signées :');
(data ?? []).forEach((o) =>
  console.log(
    `   ${o.dossier_number} | ${o.signed_at?.slice(0, 19)} | ${o.signer_name} | IP=${o.signer_ip ?? '—'} | ${o.signature_certificate_id ?? 'sans certificat'}`
  )
);
console.log(
  "\n   Les signatures antérieures n'ont ni IP ni empreinte : elles ont été posées\n" +
    "   avant cette correction. Leur certificat affichera « non enregistrée »."
);
