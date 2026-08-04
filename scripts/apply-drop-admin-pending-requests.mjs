/**
 * apply-drop-admin-pending-requests.mjs
 * Supprime la table admin_pending_requests, ses deux triggers de reconstruction
 * intégrale (sur offers et sur clients) et les deux fonctions associées.
 *
 * Contexte : la table n'était qu'une projection de offers + clients, lue nulle
 * part, mais reconstruite EN ENTIER à chaque ligne d'offre ou de client touchée
 * (9,6 M de lignes écrites pour 626 lignes utiles). Voir l'en-tête de
 * supabase/migrations/20260804150000_drop_admin_pending_requests.sql.
 *
 * Le script REVÉRIFIE en base, juste avant de supprimer, qu'aucun objet ne
 * dépend de la table (vue, fonction, job pg_cron, clé étrangère). Si un
 * dépendant apparaît, il s'arrête sans rien toucher : la garantie « morte »
 * date de l'analyse du 04/08/2026, elle doit être revalidée à l'exécution.
 *
 * Idempotent : tout est en DROP ... IF EXISTS, relançable sans risque.
 * Usage : node scripts/apply-drop-admin-pending-requests.mjs
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

/**
 * Lecture seule via kpi_run_query. Le garde-fou de la fonction teste `^(select|with)`
 * après un `btrim` qui ne retire QUE les espaces : un retour à la ligne en tête
 * ferait rejeter la requête. D'où l'aplatissement des littéraux multilignes.
 */
const read = async (label, sql) => {
  const { data, error } = await sb.rpc('kpi_run_query', {
    p_sql: sql.trim().replace(/\s+/g, ' '),
  });
  if (error) {
    console.error(`❌ ${label} :`, error.message);
    process.exit(1);
  }
  return data;
};

const exec = async (sql, label) => {
  const { error } = await sb.rpc('execute_sql', { sql });
  if (error) {
    console.error(`❌ ${label} :`, error.message);
    process.exit(1);
  }
};

// ─── 1) Revérification : la table est-elle toujours morte ? ───────────────────

console.log('⏳ Vérification des dépendances…');

const dependants = await read(
  'Recherche de dépendants',
  `
  select 'vue' as kind, c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('v', 'm')
     and n.nspname not in ('pg_catalog', 'information_schema')
     and pg_get_viewdef(c.oid) like '%admin_pending_requests%'
  union all
  select 'fonction', p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema')
     and p.prosrc like '%admin_pending_requests%'
     and p.proname not in ('refresh_admin_pending_requests',
                           'trigger_refresh_admin_pending_requests')
  union all
  select 'job pg_cron', j.jobname
    from cron.job j
   where j.command like '%admin_pending_requests%'
  union all
  select 'clé étrangère', con.conname
    from pg_constraint con
    join pg_class ref on ref.oid = con.confrelid
   where ref.relname = 'admin_pending_requests' and con.contype = 'f'
  `
);

if (dependants.length > 0) {
  console.error('❌ Des objets dépendent encore de admin_pending_requests :');
  for (const d of dependants) console.error(`   - ${d.kind} : ${d.name}`);
  console.error('   Suppression annulée. Traiter ces dépendances d’abord.');
  process.exit(1);
}
console.log('✅ Aucun dépendant : vue, fonction tierce, job pg_cron ou clé étrangère');

// ─── 2) Suppression ──────────────────────────────────────────────────────────

const sql = readFileSync(
  join(__dirname, '../supabase/migrations/20260804150000_drop_admin_pending_requests.sql'),
  'utf8'
);

console.log('⏳ Suppression de la table, des triggers et des fonctions…');
await exec(sql, 'Échec de la suppression');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });

// ─── 3) Contrôle ─────────────────────────────────────────────────────────────

const rest = await read(
  'Contrôle final',
  `
  select 'table' as kind, c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'admin_pending_requests'
  union all
  select 'trigger', t.tgname
    from pg_trigger t
    join pg_class cl on cl.oid = t.tgrelid
   where cl.relname in ('offers', 'clients')
     and not t.tgisinternal
     and t.tgname like 'refresh_admin_pending_requests%'
  union all
  select 'fonction', p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('refresh_admin_pending_requests',
                       'trigger_refresh_admin_pending_requests')
  `
);

if (rest.length > 0) {
  console.error('❌ Objets encore présents après suppression :');
  for (const r of rest) console.error(`   - ${r.kind} : ${r.name}`);
  process.exit(1);
}

console.log('✅ Table, triggers et fonctions supprimés');
console.log(
  '   Les écritures sur offers et clients ne déclenchent plus de reconstruction.'
);
