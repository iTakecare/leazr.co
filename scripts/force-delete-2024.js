/**
 * force-delete-2024.js
 *
 * Supprime TOUS les enregistrements importés pour 2024 en cherchant
 * directement par dossier_number dans la DB (ne dépend pas du manifest).
 * Protège les données originales (identifiées via le tag [import-2024-] dans remarks).
 *
 * Usage:
 *   node scripts/force-delete-2024.js --dry-run   ← vérifie sans supprimer
 *   node scripts/force-delete-2024.js             ← supprime réellement
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const DRY_RUN = process.argv.includes('--dry-run');

// Tous les dossier_numbers du CSV 2024 (61 dossiers)
const DOSSIERS_2024 = [
  '180-19681','180-19866','180-20348','180-20361','180-20363',
  '180-21116','180-21194','180-21318','180-21341','180-21477',
  '180-21491-A','180-21491-B','180-21507','180-21508','180-21625',
  '180-21626','180-21752','180-21807','180-21887','180-21935',
  '180-22253','180-22427','180-22432','180-22489','180-22550',
  '180-22593','180-22594','180-22645','180-22709','180-22814',
  '180-22856','180-22857','180-22863','180-23011','180-23141',
  '180-23142','180-23147','180-23283','180-23455','180-23457',
  '180-23618','180-23642','180-23681','180-23893','180-23894',
  '180-24109','180-24297','180-24318','180-24330','180-24363-A',
  '180-24363-B','180-24394','180-24843','180-25083','180-25566',
  '180-25576','180-25672','180-25825','180-25827','180-25828',
  '180-25873',
];

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log(`\n🔍 Force-delete 2024${DRY_RUN ? ' [DRY-RUN]' : ''}`);
  console.log('━'.repeat(60));

  // 1. Trouver uniquement MES imports via le tag [import-2024-] dans remarks
  const { data: allOffers, error: offErr } = await sb
    .from('offers')
    .select('id, dossier_number, client_name, remarks')
    .eq('company_id', COMPANY_ID)
    .in('dossier_number', DOSSIERS_2024);

  if (offErr) throw new Error('Erreur lecture offers: ' + offErr.message);

  const offers    = allOffers.filter(o => o.remarks && o.remarks.includes('[import-2024-'));
  const originals = allOffers.filter(o => !o.remarks || !o.remarks.includes('[import-2024-'));

  console.log(`\n  Offres trouvées (total dossiers 2024) : ${allOffers.length}`);
  console.log(`  → dont importées par nos scripts      : ${offers.length}`);
  console.log(`  → dont données originales (protégées) : ${originals.length}`);
  console.log('');
  offers.forEach(o => console.log(`    🗑️  ${o.dossier_number.padEnd(20)} | ${(o.client_name || '').slice(0,30).padEnd(30)} | id=${o.id}`));
  originals.forEach(o => console.log(`    🔒 ${o.dossier_number.padEnd(20)} | ${(o.client_name || '').slice(0,30).padEnd(30)} | PROTÉGÉ (original)`));

  if (!offers.length) {
    console.log('\n✅ Aucune offre 2024 importée trouvée — base déjà propre.');
    return;
  }

  const offerIds = offers.map(o => o.id);

  // 2. Contrats liés
  const { data: contracts } = await sb
    .from('contracts')
    .select('id')
    .in('offer_id', offerIds);
  console.log(`\n  Contrats trouvés      : ${contracts?.length || 0}`);

  // 3. Factures liées
  const { data: invoices } = await sb
    .from('invoices')
    .select('id')
    .eq('company_id', COMPANY_ID)
    .in('offer_id', offerIds);
  console.log(`  Factures trouvées     : ${invoices?.length || 0}`);

  // 4. Équipements liés
  const { data: equipment } = await sb
    .from('offer_equipment')
    .select('id')
    .in('offer_id', offerIds);
  console.log(`  Équipements trouvés   : ${equipment?.length || 0}`);

  if (DRY_RUN) {
    console.log('\nℹ️  DRY-RUN — relancer sans --dry-run pour supprimer réellement.');
    return;
  }

  console.log('\n🗑️  Suppression en cours...');

  const del = async (table, ids, label) => {
    if (!ids?.length) return;
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) console.error(`  ❌ ${label}: ${error.message}`);
    else console.log(`  ✅ ${label.padEnd(25)}: ${ids.length} supprimé(s)`);
  };

  await del('invoices',        invoices?.map(r => r.id) || [],   'invoices');
  await del('contracts',       contracts?.map(r => r.id) || [],  'contracts');
  await del('offer_equipment', equipment?.map(r => r.id) || [],  'offer_equipment');
  await del('offers',          offerIds,                          'offers');

  const total = (invoices?.length||0) + (contracts?.length||0) + (equipment?.length||0) + offerIds.length;
  console.log(`\n✅ Terminé — ${total} enregistrement(s) supprimé(s)`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
