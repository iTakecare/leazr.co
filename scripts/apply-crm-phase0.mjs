/**
 * apply-crm-phase0.mjs
 * CRM Acquisition — Phase 0 : rattachement des emails IMAP aux clients,
 * colonnes de triage sur contact_submissions, activation des crons de rappel.
 *
 * Tout est découpé : le DDL bloc par bloc (marqueurs `-- @@SPLIT@@`), le
 * backfill des emails par lots. Lancé d'un seul tenant, l'ensemble dépasse le
 * statement_timeout de Postgres — c'est ce qui a fait échouer la première
 * tentative.
 *
 * Idempotent : relançable sans risque, il reprend là où il s'est arrêté.
 *
 * Usage : node scripts/apply-crm-phase0.mjs
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

// ─── 1) DDL ──────────────────────────────────────────────────────────────────

// Le fichier est découpé sur les marqueurs `-- @@SPLIT@@` : chaque bloc part
// dans son propre execute_sql. Un fichier envoyé d'un bloc dépasse le
// statement_timeout dès que la création d'index touche une grosse table.
const blocks = readFileSync(
  join(__dirname, '../supabase/migrations/20260804100000_crm_phase0.sql'),
  'utf8'
)
  .replaceAll('<SERVICE_ROLE_KEY>', SUPABASE_SERVICE_KEY)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  // Un bloc qui ne contient que des commentaires (en-tête de fichier, section
  // déplacée dans ce script) ferait échouer execute_sql sur une requête vide.
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log(`⏳ Application du DDL Phase 0 (${blocks.length} blocs)…`);
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec DDL Phase 0, bloc ${index + 1}/${blocks.length}`);
  process.stdout.write(`\r   bloc ${index + 1}/${blocks.length}`);
}
console.log('\n✅ DDL Phase 0 appliqué (colonnes, fonctions, index, crons)');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));

// ─── 2) Backfill des emails, par lots ────────────────────────────────────────

// Volontairement petit : chaque ligne déclenche jusqu'à deux appels de
// match_email_to_client, qui fait lui-même trois requêtes. 500 lignes = ~1000
// appels, ce qui reste très en dessous du statement_timeout.
const BATCH = 500;

const remaining = async () => {
  const { count, error } = await sb
    .from('synced_emails')
    .select('*', { count: 'exact', head: true })
    .is('linked_client_checked_at', null);
  if (error) {
    console.error('❌ Comptage des emails restants :', error.message);
    process.exit(1);
  }
  return count ?? 0;
};

let todo = await remaining();
const initial = todo;
console.log(`⏳ Backfill du rattachement email → client : ${initial} emails à examiner`);

let guard = 0;
while (todo > 0) {
  // Garde-fou : si une passe n'avance pas, on s'arrête plutôt que de boucler.
  if (++guard > Math.ceil(initial / BATCH) + 10) {
    console.error('❌ Le backfill ne converge pas, arrêt.');
    process.exit(1);
  }

  await run(
    `
    update public.synced_emails e
       set linked_client_id = coalesce(
             public.match_email_to_client(e.company_id, e.from_address),
             public.match_email_to_client(e.company_id, e.to_address)
           ),
           linked_client_checked_at = now()
     where e.id in (
       select id from public.synced_emails
        where linked_client_checked_at is null
        limit ${BATCH}
     );
  `,
    'Échec du lot de backfill'
  );

  const before = todo;
  todo = await remaining();
  if (todo >= before) {
    console.error('❌ Le lot n\'a rien traité, arrêt.');
    process.exit(1);
  }
  process.stdout.write(`\r   ${initial - todo}/${initial} emails traités`);
}
console.log(`\n✅ Backfill terminé`);

const { count: linked } = await sb
  .from('synced_emails')
  .select('*', { count: 'exact', head: true })
  .not('linked_client_id', 'is', null);
console.log(`   ${linked ?? 0} emails rattachés à un client`);

console.log('\n▶️  Enchaîner avec : node scripts/apply-crm-phase1.mjs');
