/**
 * apply-crm-phase1.mjs
 * CRM Acquisition — Phase 1 : socle de données (pipeline_stages, contacts,
 * opportunities, crm_activities) + backfill de l'existant + projection de
 * l'historique dans la timeline.
 *
 * Tout est découpé : le DDL bloc par bloc (marqueurs `-- @@SPLIT@@`), le
 * backfill des opportunités par lots de 300 (chaque insertion déclenche
 * sync_opportunity_stage, soit une requête par ligne), la projection de
 * l'historique par lots de 2000. En un seul statement, chacune de ces étapes
 * dépasse le statement_timeout de Postgres.
 *
 * Idempotent : l'index unique (source_table, source_id) de crm_activities
 * garantit qu'aucune activité n'est projetée deux fois — relançable sans risque.
 *
 * Prérequis : node scripts/apply-crm-phase0.mjs
 * Usage     : node scripts/apply-crm-phase1.mjs
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

const countActivities = async (sourceTable) => {
  const { count, error } = await sb
    .from('crm_activities')
    .select('*', { count: 'exact', head: true })
    .eq('source_table', sourceTable);
  if (error) {
    console.error('❌ Comptage crm_activities :', error.message);
    process.exit(1);
  }
  return count ?? 0;
};

// ─── 1) DDL + backfill borné ─────────────────────────────────────────────────

// Découpage sur `-- @@SPLIT@@` : un bloc par section, sinon la création des
// tables + RLS + backfill des opportunités dépasse le statement_timeout.
const blocks = readFileSync(
  join(__dirname, '../supabase/migrations/20260804110000_crm_phase1_opportunities.sql'),
  'utf8'
)
  .split('-- @@SPLIT@@')
  .map((b) => b.trim())
  // Un bloc qui ne contient que des commentaires (en-tête de fichier, section
  // déplacée dans ce script) ferait échouer execute_sql sur une requête vide.
  .filter((b) => b.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')));

console.log(`⏳ Application du socle CRM (${blocks.length} blocs)…`);
for (const [index, block] of blocks.entries()) {
  await run(block, `Échec DDL Phase 1, bloc ${index + 1}/${blocks.length}`);
  process.stdout.write(`\r   bloc ${index + 1}/${blocks.length}`);
}
console.log('\n✅ Socle appliqué');

await sb.rpc('execute_sql', { sql: `NOTIFY pgrst, 'reload schema';` });
await new Promise((r) => setTimeout(r, 3000));

// ─── 2) Backfill : l'existant devient du pipeline ────────────────────────────
//
// Par lots : chaque opportunité créée déclenche sync_opportunity_stage (une
// requête sur pipeline_stages par ligne), ce qui fait exploser un INSERT global.

const pending = async (table, column) => {
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true })
    .is(column, null);
  if (error) {
    console.error(`❌ Comptage ${table}.${column} :`, error.message);
    process.exit(1);
  }
  return count ?? 0;
};

// 2a) Contacts issus des clients, puis des collaborateurs
console.log('⏳ Contacts issus des clients et collaborateurs…');
await run(
  `
  insert into public.contacts (company_id, client_id, first_name, last_name, email, phone, company_name, vat_number, source, created_at)
  select distinct on (c.company_id, lower(c.email))
         c.company_id, c.id,
         coalesce(c.first_name, split_part(coalesce(c.contact_name, c.name), ' ', 1)),
         coalesce(c.last_name,  nullif(substr(coalesce(c.contact_name, c.name), position(' ' in coalesce(c.contact_name, c.name)) + 1), coalesce(c.contact_name, c.name))),
         lower(c.email), c.phone, coalesce(c.company, c.name), c.vat_number,
         'backfill_client', c.created_at
    from public.clients c
   where c.email is not null and c.email <> '' and c.company_id is not null
   order by c.company_id, lower(c.email), c.created_at asc
  on conflict do nothing;`,
  'Backfill contacts (clients)'
);
await run(
  `
  insert into public.contacts (company_id, client_id, first_name, last_name, email, phone, job_title, company_name, source, created_at)
  select distinct on (cl.company_id, lower(col.email))
         cl.company_id, col.client_id,
         split_part(col.name, ' ', 1),
         nullif(substr(col.name, position(' ' in col.name) + 1), col.name),
         lower(col.email), col.phone, col.role, coalesce(cl.company, cl.name),
         'backfill_collaborator', col.created_at
    from public.collaborators col
    join public.clients cl on cl.id = col.client_id
   where col.email is not null and col.email <> '' and cl.company_id is not null
     and not exists (
       select 1 from public.contacts ct
        where ct.company_id = cl.company_id and lower(ct.email) = lower(col.email)
     )
   order by cl.company_id, lower(col.email), col.created_at asc
  on conflict do nothing;`,
  'Backfill contacts (collaborateurs)'
);
const { count: contactsCount } = await sb
  .from('contacts')
  .select('*', { count: 'exact', head: true });
console.log(`✅ ${contactsCount ?? 0} contacts`);

// 2b) Une opportunité par offre. L'id est tiré dans la CTE puis réutilisé pour
//     l'UPDATE : le rattachement offre <-> opportunité est déterministe.
//     Le workflow de financement est projeté sur le cycle de vente — une offre
//     signifie qu'on a au minimum chiffré, donc jamais en dessous de « Qualifié ».
const OPP_BATCH = 300;
let offersTodo = await pending('offers', 'opportunity_id');
const offersInitial = offersTodo;
console.log(`⏳ Une opportunité par offre : ${offersInitial} offres à reprendre`);

while (offersTodo > 0) {
  await run(
    `
    with src as materialized (
      select
        o.id              as offer_id,
        gen_random_uuid() as opp_id,
        o.company_id,
        coalesce(nullif(o.client_name, ''), 'Opportunité')
          || case when o.dossier_number is not null then ' — ' || o.dossier_number else '' end as name,
        o.client_id,
        (select ct.id from public.contacts ct
          where ct.company_id = o.company_id and ct.client_id = o.client_id
          order by ct.created_at asc limit 1) as primary_contact_id,
        ps.id             as stage_id,
        o.user_id,
        o.source, o.utm_source, o.utm_medium, o.utm_campaign, o.utm_term, o.utm_content,
        o.monthly_payment, o.financed_amount,
        o.created_at, o.updated_at
      from public.offers o
      join public.pipeline_stages ps
        on ps.company_id = o.company_id
       and ps.key = case
            when o.workflow_status in ('leaser_approved','contract_sent','signed','financed','accepted') then 'won'
            when o.workflow_status in ('rejected','internal_rejected','leaser_rejected','refused','cancelled','without_follow_up') then 'lost'
            when o.workflow_status in ('internal_approved','leaser_introduced','leaser_pending','leaser_docs_requested') then 'negotiation'
            when o.workflow_status in ('sent','sent_to_client','info_requested','internal_docs_requested') then 'proposal'
            else 'qualified'
           end
      where o.company_id is not null
        and o.opportunity_id is null
      limit ${OPP_BATCH}
    ),
    ins as (
      insert into public.opportunities (
        id, company_id, name, client_id, primary_contact_id, stage_id, owner_id,
        source, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        created_from, estimated_monthly_payment, estimated_amount,
        created_by, created_at, updated_at, last_activity_at, stage_changed_at
      )
      select
        opp_id, company_id, name, client_id, primary_contact_id, stage_id, user_id,
        source, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        'offer_backfill', monthly_payment, financed_amount,
        user_id, created_at, updated_at, updated_at, updated_at
      from src
      returning id
    )
    update public.offers o
       set opportunity_id = src.opp_id
      from src
     where o.id = src.offer_id;`,
    'Backfill des opportunités'
  );

  const before = offersTodo;
  offersTodo = await pending('offers', 'opportunity_id');
  if (offersTodo >= before) {
    // Reste des offres sans company_id : elles n'appartiennent à aucun tenant
    // et ne peuvent pas devenir des opportunités. On s'arrête là.
    console.log(`\n⚠️  ${offersTodo} offres non reprises (company_id absent)`);
    break;
  }
  process.stdout.write(`\r   ${offersInitial - offersTodo}/${offersInitial} offres reprises`);
}
console.log(`\n✅ Opportunités créées`);

// 2c) Owner des clients : le créateur de leur offre la plus récente
await run(
  `
  update public.clients c
     set owner_id = sub.user_id
    from (
      select distinct on (client_id) client_id, user_id
        from public.offers
       where client_id is not null and user_id is not null
       order by client_id, created_at desc
    ) sub
   where c.id = sub.client_id and c.owner_id is null;`,
  'Attribution des clients'
);
console.log('✅ Clients attribués à un commercial');

// ─── 3) Projection de l'historique, par lots ─────────────────────────────────
//
// Le trigger de rafraîchissement de last_activity_at est neutralisé le temps du
// backfill : sinon chaque activité projetée déclenche un UPDATE ligne à ligne
// sur opportunities. On recalcule la valeur en une passe à la fin.

await run(
  `alter table public.crm_activities disable trigger trg_crm_activities_touch;`,
  'Neutralisation du trigger'
);

const BATCH = 2000;

/** Sources volumineuses : projetées par lots, avec anti-jointure sur l'existant. */
const BATCHED_SOURCES = [
  {
    table: 'synced_emails',
    label: 'Emails de la messagerie',
    sql: `
      insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, channel, occurred_at, subject, body, payload, source_table, source_id)
      select e.company_id, o.opportunity_id, coalesce(e.linked_client_id, o.client_id), e.linked_offer_id, 'email',
             'in', 'email', coalesce(e.received_at, e.created_at), e.subject,
             left(coalesce(e.body_text, ''), 4000),
             jsonb_build_object('from', e.from_address, 'from_name', e.from_name, 'to', e.to_address),
             'synced_emails', e.id
        from public.synced_emails e
        left join public.offers o on o.id = e.linked_offer_id
        left join public.crm_activities a
               on a.source_table = 'synced_emails' and a.source_id = e.id
       where (e.linked_client_id is not null or e.linked_offer_id is not null)
         and a.id is null
       limit ${BATCH}
      on conflict do nothing;`,
  },
  {
    table: 'chat_messages',
    label: 'Messages WhatsApp / SMS / chat',
    sql: `
      insert into public.crm_activities (company_id, opportunity_id, client_id, type, direction, channel, occurred_at, subject, body, payload, source_table, source_id)
      select conv.company_id,
             (select opp.id from public.opportunities opp
               where opp.client_id = conv.client_id and opp.company_id = conv.company_id
               order by opp.created_at desc limit 1),
             conv.client_id,
             case conv.channel when 'whatsapp' then 'whatsapp' when 'sms' then 'sms' else 'note' end,
             case when m.direction = 'inbound' then 'in' else 'out' end,
             coalesce(conv.channel, 'web'),
             m.created_at, null, m.message,
             jsonb_build_object('sender_name', m.sender_name, 'sender_type', m.sender_type, 'message_type', m.message_type),
             'chat_messages', m.id
        from public.chat_messages m
        join public.chat_conversations conv on conv.id = m.conversation_id
        left join public.crm_activities a
               on a.source_table = 'chat_messages' and a.source_id = m.id
       where conv.client_id is not null
         and a.id is null
       limit ${BATCH}
      on conflict do nothing;`,
  },
];

/** Sources bornées : une seule passe suffit. */
const SINGLE_SHOT_SOURCES = [
  {
    label: "Notes d'offre",
    sql: `
      insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, occurred_at, actor_id, body, source_table, source_id)
      select o.company_id, o.opportunity_id, o.client_id, o.id, 'note', 'internal', n.created_at, n.created_by, n.content, 'offer_notes', n.id
        from public.offer_notes n
        join public.offers o on o.id = n.offer_id
       where o.company_id is not null
      on conflict do nothing;`,
  },
  {
    label: 'Appels loggés',
    sql: `
      insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, channel, occurred_at, actor_id, subject, body, outcome, payload, source_table, source_id)
      select l.company_id, o.opportunity_id, o.client_id, l.offer_id, 'call', 'out', 'phone', l.called_at, l.created_by,
             case l.status when 'reached' then 'Contact établi'
                           when 'voicemail' then 'Répondeur'
                           else 'Sans réponse' end,
             l.notes, l.status,
             jsonb_build_object('callback_date', l.callback_date),
             'offer_call_logs', l.id
        from public.offer_call_logs l
        join public.offers o on o.id = l.offer_id
      on conflict do nothing;`,
  },
  {
    label: 'Appels Alex / softphone',
    sql: `
      insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, channel, occurred_at, actor_id, actor_label, subject, body, outcome, payload, source_table, source_id)
      select vc.company_id, o.opportunity_id, vc.client_id, vc.offer_id, 'voice_ai',
             case when vc.direction = 'inbound' then 'in' else 'out' end,
             'voice', vc.created_at, vc.initiated_by,
             case when vc.initiated_by is null then 'Alex (IA)' else null end,
             coalesce(vc.summary, 'Appel ' || coalesce(vc.status, '')),
             vc.transcription, vc.outcome,
             jsonb_build_object('duration_seconds', vc.duration_seconds, 'status', vc.status, 'recording_url', vc.recording_url),
             'voice_calls', vc.id
        from public.voice_calls vc
        left join public.offers o on o.id = vc.offer_id
      on conflict do nothing;`,
  },
];

for (const source of SINGLE_SHOT_SOURCES) {
  await run(source.sql, `Projection « ${source.label} »`);
  console.log(`✅ ${source.label} projetés`);
}

for (const source of BATCHED_SOURCES) {
  let before = await countActivities(source.table);
  process.stdout.write(`⏳ ${source.label}…`);
  for (;;) {
    await run(source.sql, `Projection « ${source.label} »`);
    const after = await countActivities(source.table);
    if (after === before) break;
    before = after;
    process.stdout.write(`\r⏳ ${source.label} : ${after} projetés`);
  }
  console.log(`\r✅ ${source.label} : ${before} projetés          `);
}

await run(
  `alter table public.crm_activities enable trigger trg_crm_activities_touch;`,
  'Réactivation du trigger'
);

console.log('⏳ Recalcul de la dernière activité…');
await run(
  `
  update public.opportunities o
     set last_activity_at = greatest(coalesce(o.last_activity_at, a.max_at), a.max_at)
    from (select opportunity_id, max(occurred_at) as max_at
            from public.crm_activities
           where opportunity_id is not null
           group by opportunity_id) a
   where o.id = a.opportunity_id;

  update public.contacts c
     set last_activity_at = a.max_at
    from (select contact_id, max(occurred_at) as max_at
            from public.crm_activities
           where contact_id is not null
           group by contact_id) a
   where c.id = a.contact_id;
`,
  'Recalcul de last_activity_at'
);
console.log('✅ Dernière activité recalculée');

// ─── 4) État des lieux ───────────────────────────────────────────────────────

console.log('\n📊 État des lieux :');
for (const table of ['pipeline_stages', 'contacts', 'opportunities', 'crm_activities']) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  console.log(error ? `   ${table} : erreur ${error.message}` : `   ${table} : ${count} lignes`);
}

const { count: orphans } = await sb
  .from('offers')
  .select('*', { count: 'exact', head: true })
  .is('opportunity_id', null);
console.log(`   offres sans opportunité : ${orphans ?? '?'} (attendu : 0)`);

console.log('\n▶️  Le socle est en place. Déploiement : git push');
