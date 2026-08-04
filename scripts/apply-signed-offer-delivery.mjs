/**
 * apply-signed-offer-delivery.mjs
 * Colonnes de suivi de la livraison de l'offre signée + bucket offer-documents.
 *
 * Idempotent. Usage : node scripts/apply-signed-offer-delivery.mjs
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
  join(__dirname, '../supabase/migrations/20260804170000_signed_offer_delivery.sql'),
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

const { data: buckets } = await sb.storage.listBuckets();
const bucket = (buckets ?? []).find((b) => b.id === 'offer-documents');
console.log(
  bucket
    ? `✅ bucket offer-documents présent (public: ${bucket.public})`
    : '⚠️  bucket offer-documents introuvable'
);
