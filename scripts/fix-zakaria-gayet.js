/**
 * fix-zakaria-gayet.js
 *
 * Corrige le dossier 180-18228 (Zakaria Gayet / ITC-2023-0008) :
 * Le dataset contient de mauvais équipements (~24k€). La vraie facture Grenke
 * ITC-2023-0008 contient 3 équipements pour un achat total de 2845.30€ et
 * une facturation Grenke de 4471.95€.
 *
 * Corrections :
 *   1. Supprime les offer_equipment existants (faux)
 *   2. Insère les 3 vrais équipements dans offer_equipment
 *   3. Supprime les contract_equipment existants (faux)
 *   4. Insère les 3 vrais équipements dans contract_equipment
 *   5. Met à jour le billing_data de l'invoice ITC-2023-0008
 *
 * Usage :
 *   node scripts/fix-zakaria-gayet.js --dry-run
 *   node scripts/fix-zakaria-gayet.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Données correctes (source: tableau + facture Grenke ITC-2023-0008) ──────
const DOSSIER_NUMBER  = '180-18228';
const INVOICE_NUMBER  = 'ITC-2023-0008';
const DATE_DOSSIER    = '2023-01-01';
const DATE_FACTURE    = '2023-02-01';
const CA              = 4471.95;
const ACHAT           = 2845.30;
const MARGE           = 1626.65;
const MENSUALITE      = 146.68;

// Équipements réels selon la facture Grenke + tableau iTakecare
const CORRECT_EQUIPMENT = [
  {
    title:            'Macbook Pro 16 M1 Pro / 16 Go RAM / 512 Go SSD',
    qty:              1,
    purchase_price:   1805.00,
    selling_price:    3047.20,   // Facturation Grenke total
    monthly_payment:  null,
    margin:           null,
    serial_number:    null,
  },
  {
    title:            'Samsung The Frame 65" + frame couleur bois foncé',
    qty:              1,
    purchase_price:   924.80,
    selling_price:    1424.75,
    monthly_payment:  null,
    margin:           null,
    serial_number:    null,
  },
  {
    title:            'Minis Forum Mini PC W10 (serv. Impression)',
    qty:              1,
    purchase_price:   115.50,
    selling_price:    0.00,
    monthly_payment:  null,
    margin:           null,
    serial_number:    null,
  },
];

// Vérif totaux
const totalAchat   = CORRECT_EQUIPMENT.reduce((s, e) => s + e.purchase_price * e.qty, 0);
const totalSelling = CORRECT_EQUIPMENT.reduce((s, e) => s + e.selling_price   * e.qty, 0);
console.log(`\n📦 Équipements à appliquer :`);
console.log(`   Total achat   = ${totalAchat.toFixed(2)}€  (cible: ${ACHAT}€)`);
console.log(`   Total vente   = ${totalSelling.toFixed(2)}€  (cible: ${CA}€)`);

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN — aucune modification en base\n');

  // ── 1. Trouve l'offre ─────────────────────────────────────────────────────
  const { data: offers, error: offerErr } = await sb
    .from('offers')
    .select('id, dossier_number, financed_amount')
    .eq('dossier_number', DOSSIER_NUMBER);

  if (offerErr || !offers?.length) {
    console.error('❌ Offre introuvable:', offerErr?.message); process.exit(1);
  }
  console.log(`\n✅ Offre(s) trouvée(s) : ${offers.map(o => o.id).join(', ')}`);

  const offerIds = offers.map(o => o.id);

  // ── 2. Trouve le contrat ──────────────────────────────────────────────────
  const { data: contracts } = await sb
    .from('contracts')
    .select('id')
    .in('offer_id', offerIds);

  const contractIds = contracts?.map(c => c.id) || [];
  console.log(`✅ Contrat(s) : ${contractIds.join(', ') || 'aucun'}`);

  // ── 3. État actuel de la DB ───────────────────────────────────────────────
  const { data: existingOE } = await sb
    .from('offer_equipment')
    .select('id, title, quantity, purchase_price, selling_price')
    .in('offer_id', offerIds);

  const { data: existingCE } = contractIds.length
    ? await sb.from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price')
        .in('contract_id', contractIds)
    : { data: [] };

  console.log(`\n📊 État actuel :`);
  console.log(`   offer_equipment    : ${existingOE?.length || 0} lignes`);
  existingOE?.forEach(e => console.log(`      - ${e.title?.substring(0,40)} qty=${e.quantity} pp=${e.purchase_price}€`));
  console.log(`   contract_equipment : ${existingCE?.length || 0} lignes`);
  existingCE?.forEach(e => console.log(`      - ${e.title?.substring(0,40)} qty=${e.quantity} app=${e.actual_purchase_price ?? e.purchase_price}€`));

  console.log(`\n🔧 Corrections à appliquer :`);
  CORRECT_EQUIPMENT.forEach(e => console.log(`   + ${e.title} qty=${e.qty} pp=${e.purchase_price}€ vente=${e.selling_price}€`));

  if (DRY_RUN) {
    console.log('\n⚠️  Dry-run terminé. Relancer sans --dry-run pour appliquer.');
    return;
  }

  // ── 4. Supprime les anciens offer_equipment ───────────────────────────────
  if (existingOE?.length) {
    const { error } = await sb.from('offer_equipment').delete().in('offer_id', offerIds);
    if (error) { console.error('❌ Suppression offer_equipment:', error.message); process.exit(1); }
    console.log(`\n🗑  ${existingOE.length} offer_equipment supprimés`);
  }

  // ── 5. Insère les nouveaux offer_equipment ────────────────────────────────
  // Pour chaque offer (normalement 1 seul)
  for (const offer of offers) {
    const oeRows = CORRECT_EQUIPMENT.map(e => {
      // Calcul marge par item (proportionnel si selling > 0)
      const selling = e.selling_price > 0 ? e.selling_price : e.purchase_price;
      const margin  = Math.round(((selling - e.purchase_price) / selling) * 10000) / 100;
      return {
        offer_id:         offer.id,
        title:            e.title,
        quantity:         e.qty,
        purchase_price:   e.purchase_price,
        selling_price:    e.selling_price,
        monthly_payment:  e.monthly_payment || Math.round((e.selling_price / CA * MENSUALITE) * 100) / 100,
        margin:           e.selling_price > 0 ? margin : 0,
        serial_number:    e.serial_number,
        created_at:       DATE_DOSSIER,
        updated_at:       DATE_FACTURE,
      };
    });

    const { error } = await sb.from('offer_equipment').insert(oeRows);
    if (error) { console.error('❌ Insert offer_equipment:', error.message); process.exit(1); }
    console.log(`✅ ${oeRows.length} offer_equipment insérés pour offer ${offer.id}`);
  }

  // ── 6. Supprime les anciens contract_equipment ────────────────────────────
  if (contractIds.length && existingCE?.length) {
    const { error } = await sb.from('contract_equipment').delete().in('contract_id', contractIds);
    if (error) { console.error('❌ Suppression contract_equipment:', error.message); process.exit(1); }
    console.log(`🗑  ${existingCE.length} contract_equipment supprimés`);
  }

  // ── 7. Insère les nouveaux contract_equipment ─────────────────────────────
  for (const contract of (contracts || [])) {
    // Normalise actual_purchase_price pour que la somme = ACHAT exactement
    const rawTotal = CORRECT_EQUIPMENT.reduce((s, e) => s + e.purchase_price * e.qty, 0);
    const normRatio = ACHAT / rawTotal; // = 2845.30 / 2845.30 = 1.0 dans ce cas

    const ceRows = CORRECT_EQUIPMENT.map((e, i) => {
      const selling = e.selling_price > 0 ? e.selling_price : e.purchase_price;
      const margin  = e.selling_price > 0
        ? Math.round(((selling - e.purchase_price) / selling) * 10000) / 100
        : 0;
      return {
        contract_id:           contract.id,
        title:                 e.title,
        quantity:              e.qty,
        purchase_price:        e.purchase_price,
        actual_purchase_price: Math.round(e.purchase_price * normRatio * 100) / 100,
        actual_purchase_date:  DATE_FACTURE,
        order_date:            DATE_DOSSIER,
        order_status:          'received',
        margin,
        monthly_payment:       Math.round((e.selling_price / CA * MENSUALITE) * 100) / 100,
        serial_number:         e.serial_number,
        created_at:            DATE_DOSSIER,
        updated_at:            DATE_FACTURE,
      };
    });

    const { error } = await sb.from('contract_equipment').insert(ceRows);
    if (error) { console.error('❌ Insert contract_equipment:', error.message); process.exit(1); }
    console.log(`✅ ${ceRows.length} contract_equipment insérés pour contrat ${contract.id}`);
  }

  // ── 8. Met à jour le billing_data de l'invoice ────────────────────────────
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, billing_data')
    .eq('invoice_number', INVOICE_NUMBER);

  if (!invoices?.length) {
    console.log(`⚠️  Facture ${INVOICE_NUMBER} introuvable en DB — billing_data non mis à jour`);
  } else {
    for (const inv of invoices) {
      const existing = inv.billing_data || {};

      const newBillingData = {
        ...existing,
        equipment_data: CORRECT_EQUIPMENT.map(e => {
          const selling = e.selling_price > 0 ? e.selling_price : e.purchase_price;
          const margin  = e.selling_price > 0
            ? Math.round(((selling - e.purchase_price) / selling) * 10000) / 100
            : 0;
          return {
            title:                 e.title,
            serial_number:         e.serial_number || '',
            quantity:              e.qty,
            purchase_price:        e.purchase_price,
            selling_price_excl_vat: e.selling_price,
            monthly_payment:       Math.round((e.selling_price / CA * MENSUALITE) * 100) / 100,
            margin,
          };
        }),
        invoice_totals: {
          total_excl_vat: CA,
          vat_rate:       0.21,
          vat_amount:     Math.round(CA * 0.21 * 100) / 100,
          total_incl_vat: Math.round(CA * 1.21 * 100) / 100,
        },
      };

      const { error } = await sb
        .from('invoices')
        .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
        .eq('id', inv.id);

      if (error) { console.error('❌ Update invoice billing_data:', error.message); }
      else console.log(`✅ Invoice ${INVOICE_NUMBER} (id=${inv.id}) billing_data mis à jour`);
    }
  }

  // ── 9. Vérification finale ────────────────────────────────────────────────
  console.log('\n🔍 Vérification finale :');
  const { data: finalCE } = await sb
    .from('contract_equipment')
    .select('title, quantity, purchase_price, actual_purchase_price, actual_purchase_date')
    .in('contract_id', contractIds);

  const finalTotal = (finalCE || []).reduce(
    (s, e) => s + (e.actual_purchase_price ?? e.purchase_price) * e.quantity, 0
  );
  console.log(`   contract_equipment : ${finalCE?.length} lignes, total=${finalTotal.toFixed(2)}€ (cible: ${ACHAT}€)`);
  finalCE?.forEach(e => console.log(
    `      - ${(e.title||'').substring(0,40)} qty=${e.quantity} app=${(e.actual_purchase_price??e.purchase_price).toFixed(2)}€`
  ));

  const ok = Math.abs(finalTotal - ACHAT) < 0.05;
  console.log(`\n${ok ? '✅ SUCCÈS' : '❌ ÉCHEC'} — total=${finalTotal.toFixed(2)}€ vs cible=${ACHAT}€`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
