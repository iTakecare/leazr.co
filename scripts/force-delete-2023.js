/**
 * force-delete-2023.js
 *
 * Supprime TOUS les enregistrements importés pour 2023 en cherchant
 * directement par dossier_number dans la DB (ne dépend pas du manifest).
 *
 * Usage:
 *   node scripts/force-delete-2023.js --dry-run   ← vérifie sans supprimer
 *   node scripts/force-delete-2023.js             ← supprime réellement
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const DRY_RUN = process.argv.includes('--dry-run');

// Tous les dossier_numbers du CSV 2023 (57 dossiers)
const DOSSIERS_2023 = [
  '021-202304-0033','180-17784','180-17866','180-17873','180-17879',
  '180-17880','180-17915','180-17992','180-17993','180-17994',
  '180-18022','180-18073','180-18112','180-18149','180-18223',
  '180-18228','180-18243','180-18256','180-18263','180-18299',
  '180-18328','180-18337','180-18396','180-18618','180-18620',
  '180-18621','180-18678','180-18679','180-18710','180-18816',
  '180-18987','180-19007','180-19328','180-19329','180-19681',
  '180-19695','180-19721','180-19781','180-19810','180-19866',
  '180-19885','180-20001','180-20007','180-20032','180-20164',
  '180-20334','180-20346','180-20347','180-20349','180-20362',
  '180-20591','180-20594','180-20608','180-20711','180-20969',
  '180-21094','180-21111',
];

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log(`\n🔍 Force-delete 2023${DRY_RUN ? ' [DRY-RUN]' : ''}`);
  console.log('━'.repeat(60));

  // 1. Trouver uniquement MES imports via le remarks tag [import-2023-...]
  //    (filtre sur dossier_number ET remarks pour ne pas toucher les données originales)
  const { data: allOffers, error: offErr } = await sb
    .from('offers')
    .select('id, dossier_number, client_name, remarks')
    .eq('company_id', COMPANY_ID)
    .in('dossier_number', DOSSIERS_2023);

  if (offErr) throw new Error('Erreur lecture offers: ' + offErr.message);

  // Ne garder que celles importées par nos scripts (contiennent [import-2023- dans remarks)
  const offers = allOffers.filter(o => o.remarks && o.remarks.includes('[import-2023-'));

  console.log(`\n  Offres trouvées (total dossiers 2023) : ${allOffers.length}`);
  console.log(`  → dont importées par nos scripts      : ${offers.length}`);
  console.log(`  → dont données originales (protégées) : ${allOffers.length - offers.length}`);
  console.log('');
  offers.forEach(o => console.log(`    🗑️  ${o.dossier_number.padEnd(20)} | ${(o.client_name || '').slice(0,30).padEnd(30)} | id=${o.id}`));
  const originals = allOffers.filter(o => !o.remarks || !o.remarks.includes('[import-2023-'));
  if (originals.length) {
    originals.forEach(o => console.log(`    🔒 ${o.dossier_number.padEnd(20)} | ${(o.client_name || '').slice(0,30).padEnd(30)} | PROTÉGÉ (original)`));
  }

  if (!offers.length) {
    console.log('\n✅ Aucune offre 2023 trouvée — base déjà propre.');
    return;
  }

  const offerIds = offers.map(o => o.id);

  // 2. Trouver contrats liés (sans filtre company_id — certains contrats peuvent en être dépourvus)
  const { data: contracts } = await sb
    .from('contracts')
    .select('id')
    .in('offer_id', offerIds);
  console.log(`\n  Contrats trouvés      : ${contracts?.length || 0}`);

  // 3. Trouver factures liées
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, invoice_number')
    .eq('company_id', COMPANY_ID)
    .in('offer_id', offerIds);
  console.log(`  Factures trouvées     : ${invoices?.length || 0}`);

  // 4. Trouver équipements liés
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

  // Supprimer dans l'ordre FK-safe
  const del = async (table, ids, label) => {
    if (!ids?.length) return;
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) console.error(`  ❌ ${label}: ${error.message}`);
    else console.log(`  ✅ ${label.padEnd(25)}: ${ids.length} supprimé(s)`);
  };

  await del('invoices',        invoices?.map(r=>r.id) || [],   'invoices');
  await del('contracts',       contracts?.map(r=>r.id) || [],  'contracts');
  await del('offer_equipment', equipment?.map(r=>r.id) || [],  'offer_equipment');
  await del('offers',          offerIds,                        'offers');

  const total = (invoices?.length||0) + (contracts?.length||0) + (equipment?.length||0) + offerIds.length;
  console.log(`\n✅ Terminé — ${total} enregistrement(s) supprimé(s)`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
