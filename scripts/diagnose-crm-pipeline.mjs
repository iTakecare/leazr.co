/**
 * diagnose-crm-pipeline.mjs
 * LECTURE SEULE — n'écrit rien. Sert à comprendre comment les 964 offres se
 * répartissent réellement (statut, type, converti en contrat, ancienneté) avant
 * de corriger le mapping vers les étapes du pipeline.
 *
 * Usage : node scripts/diagnose-crm-pipeline.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: offers, error } = await sb
  .from('offers')
  .select('id, workflow_status, status, type, source, converted_to_contract, client_id, client_name, dossier_number, created_at, monthly_payment')
  .not('company_id', 'is', null);

if (error) {
  console.error('❌', error.message);
  process.exit(1);
}

console.log(`\n${offers.length} offres\n`);

const tally = (rows, key) => {
  const map = new Map();
  rows.forEach((r) => {
    const k = String(r[key] ?? '(null)');
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};

const show = (title, entries) => {
  console.log(`── ${title}`);
  entries.forEach(([k, n]) => console.log(`   ${String(n).padStart(5)}  ${k}`));
  console.log();
};

show('workflow_status', tally(offers, 'workflow_status'));
show('status', tally(offers, 'status'));
show('type', tally(offers, 'type'));
show('converted_to_contract', tally(offers, 'converted_to_contract'));

// Croisement : quels statuts sont déjà convertis en contrat ?
const converted = offers.filter((o) => o.converted_to_contract);
console.log(`── ${converted.length} offres converties en contrat, par workflow_status`);
tally(converted, 'workflow_status').forEach(([k, n]) =>
  console.log(`   ${String(n).padStart(5)}  ${k}`)
);
console.log();

// Ancienneté des offres qui tomberaient dans le fourre-tout « qualified »
const KNOWN = new Set([
  'leaser_approved', 'contract_sent', 'signed', 'financed', 'accepted',
  'rejected', 'internal_rejected', 'leaser_rejected', 'refused', 'cancelled', 'without_follow_up',
  'internal_approved', 'leaser_introduced', 'leaser_pending', 'leaser_docs_requested',
  'sent', 'sent_to_client', 'info_requested', 'internal_docs_requested',
]);
const fallback = offers.filter((o) => !KNOWN.has(o.workflow_status));
console.log(`── ${fallback.length} offres tombées dans le fourre-tout « Qualifié »`);
tally(fallback, 'workflow_status').forEach(([k, n]) =>
  console.log(`   ${String(n).padStart(5)}  ${k}`)
);
console.log();

// Ancienneté globale
const now = Date.now();
const buckets = { '< 30 j': 0, '30-90 j': 0, '90-180 j': 0, '180-365 j': 0, '> 1 an': 0 };
offers.forEach((o) => {
  const days = (now - new Date(o.created_at).getTime()) / 86400000;
  if (days < 30) buckets['< 30 j']++;
  else if (days < 90) buckets['30-90 j']++;
  else if (days < 180) buckets['90-180 j']++;
  else if (days < 365) buckets['180-365 j']++;
  else buckets['> 1 an']++;
});
show('Ancienneté (created_at)', Object.entries(buckets));

// Combien d'offres par client : mesure la redondance du pipeline
const perClient = new Map();
offers.forEach((o) => {
  const k = o.client_id ?? `(sans client) ${o.id}`;
  perClient.set(k, (perClient.get(k) ?? 0) + 1);
});
const counts = [...perClient.values()];
console.log('── Offres par client');
console.log(`   ${perClient.size} clients distincts pour ${offers.length} offres`);
console.log(`   max : ${Math.max(...counts)} offres pour un même client`);
console.log(
  `   clients avec plusieurs offres : ${counts.filter((c) => c > 1).length}`
);
console.log();

// Contrats existants : la vérité sur « déjà vendu »
const { data: contracts } = await sb.from('contracts').select('id, offer_id, client_id, status');
const contractOfferIds = new Set((contracts ?? []).map((c) => c.offer_id).filter(Boolean));
const contractClientIds = new Set((contracts ?? []).map((c) => c.client_id).filter(Boolean));
console.log('── Contrats');
console.log(`   ${(contracts ?? []).length} contrats`);
console.log(`   ${contractOfferIds.size} offres ont un contrat`);
console.log(
  `   ${offers.filter((o) => o.client_id && contractClientIds.has(o.client_id)).length} offres appartiennent à un client déjà sous contrat`
);
console.log();

// Cas signalé par l'utilisateur
const grasseels = offers.filter((o) =>
  (o.client_name ?? '').toLowerCase().includes('grasseels')
);
console.log('── Cas Patrick Grasseels');
grasseels.forEach((o) =>
  console.log(
    `   ${o.dossier_number} | workflow=${o.workflow_status} | status=${o.status} | type=${o.type} | converti=${o.converted_to_contract} | contrat=${contractOfferIds.has(o.id)} | ${o.created_at.slice(0, 10)}`
  )
);
console.log();
