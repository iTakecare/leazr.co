/**
 * import-2023-excel.js
 *
 * Import 2023 basé sur les données Excel (Gestion iTakecare.xlsx) + CSV.
 * - 55 dossiers (53 Excel + 2 Août CSV)
 * - Skip automatique des dossiers déjà en DB (vérifié par dossier_number)
 * - Vérification CA/marge par mois vs table de référence avant et après import
 * - Numéros de série des équipements intégrés depuis les PDFs Grenke (grenke-serial-numbers.json)
 * - Prix d'achat, prix de vente, marge, mensualité par ligne d'équipement
 * - Rollback via manifest
 *
 * Usage:
 *   node scripts/import-2023-excel.js --dry-run    ← vérification sans importer
 *   node scripts/import-2023-excel.js              ← import réel
 *   node scripts/import-2023-excel.js rollback     ← annuler
 *   node scripts/import-2023-excel.js --month=1    ← importer seulement janvier
 *
 * Prérequis: grenke-serial-numbers.json (généré par extract-pdf-data.py)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const ADMIN_EMAIL          = 'hello@itakecare.be';
const DATASET_PATH         = join(__dirname, 'import-2023-dataset.json');
const GRENKE_SN_PATH       = join(__dirname, 'grenke-serial-numbers.json');
const MANIFEST_PATH        = join(__dirname, 'import-manifest-2023-excel.json');

// ── Registre des bailleurs connus (données statiques) ────────────────────────
const LEASER_REGISTRY = {
  'grenke': {
    name: 'GRENKE LEASE',
    address: 'Ruisbroeksesteenweg 76',
    city: 'Ukkel',
    postal_code: '1180',
    country: 'Belgique',
    vat_number: 'BE 0873.803.219',
    email: '',
    phone: '',
  },
  'olinn': {
    name: 'Olinn',
    address: '',
    city: '',
    postal_code: '',
    country: 'Belgique',
    vat_number: '',
    email: '',
    phone: '',
  },
};

// ── Serial number matching helpers ────────────────────────────────────────────
function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenOverlap(a, b) {
  const ta = new Set(normalizeTitle(a).split(' ').filter(w => w.length > 2));
  const tb = new Set(normalizeTitle(b).split(' ').filter(w => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  return [...ta].filter(x => tb.has(x)).length / Math.max(ta.size, tb.size);
}
function findSerialNumber(equipTitle, pdfEquipment, usedSNs) {
  if (!pdfEquipment || !pdfEquipment.length) return null;
  let best = null, bestScore = 0;
  for (const pdfEq of pdfEquipment) {
    if (!pdfEq.serial_number) continue;
    if (usedSNs.has(pdfEq.serial_number)) continue;
    const score = tokenOverlap(equipTitle, pdfEq.title);
    if (score > bestScore) { bestScore = score; best = pdfEq; }
  }
  return bestScore >= 0.25 ? best : null;
}

// Table de référence CA par mois (source: image fournie)
const REF_CA = {
  1: 69669.00, 2: 78657.58, 3: 72435.29, 4: 24048.59, 5: 16863.40,
  6: 3047.26,  7: 0,        8: 9509.14,  9: 40562.64, 10: 2865.85,
  11: 47543.13, 12: 53199.26
};
const REF_MARGE = {
  1: 30921.05, 2: 26326.84, 3: 26913.17, 4: 9936.72, 5: 4553.16,
  6: 1453.93,  7: 0,        8: 3700.14,  9: 16954.46, 10: 626.85,
  11: 19398.63, 12: 14843.55
};

const MOIS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const ROLLBACK  = args.includes('rollback');
const MONTH_ARG = parseInt((args.find(a => a.startsWith('--month=')) || '').replace('--month=','')) || null;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── ROLLBACK ───────────────────────────────────────────────────────────────────
async function doRollback() {
  console.log('\n🔄 ROLLBACK import-2023-excel');
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

  const del = async (table, ids) => {
    if (!ids?.length) return;
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) console.error(`  ❌ ${table}: ${error.message}`);
    else console.log(`  🗑️  ${table.padEnd(20)}: ${ids.length} supprimé(s)`);
  };

  await del('invoices',           manifest.invoices || []);
  await del('contract_equipment', manifest.contract_equipment || []);
  await del('contracts',          manifest.contracts || []);
  await del('offer_equipment',    manifest.offer_equipment || []);
  await del('offers',             manifest.offers || []);

  const total = [manifest.invoices, manifest.contract_equipment, manifest.contracts, manifest.offer_equipment, manifest.offers]
    .reduce((s,a)=>s+(a?.length||0),0);
  console.log(`\n✅ Rollback terminé — ${total} enregistrement(s) supprimé(s)`);
}

// ── MAIN ───────────────────────────────────────────────────────────────────────
async function main() {
  if (ROLLBACK) { await doRollback(); return; }

  console.log(`\n🚀 Import 2023 Excel${DRY_RUN ? ' [DRY-RUN]' : ''}${MONTH_ARG ? ` [mois=${MONTH_ARG}]` : ''}`);
  console.log('═'.repeat(70));

  // Charger le dataset
  if (!existsSync(DATASET_PATH)) throw new Error(`Dataset introuvable: ${DATASET_PATH}`);
  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));

  // Charger les numéros de série (depuis les PDFs Grenke)
  let grenkeByDossier = {};
  if (existsSync(GRENKE_SN_PATH)) {
    const grenkeData = JSON.parse(readFileSync(GRENKE_SN_PATH, 'utf-8'));
    for (const r of grenkeData) {
      if (r.dossier_number) grenkeByDossier[r.dossier_number] = r;
    }
    console.log(`  📋 ${grenkeData.length} factures Grenke chargées (numéros de série)`);
  } else {
    console.log(`  ⚠️  grenke-serial-numbers.json introuvable — import sans S/N`);
  }

  // Filtrer par mois si demandé
  let dossiers = MONTH_ARG ? allDossiers.filter(d => d.month_invoice === MONTH_ARG) : allDossiers;
  console.log(`\n  Dataset total    : ${allDossiers.length} dossiers`);
  console.log(`  À traiter        : ${dossiers.length} dossiers${MONTH_ARG ? ` (mois ${MONTH_ARG})` : ''}`);

  // ── Récupérer user et leasers ─────────────────────────────────────────────
  const { data: authUsers } = await sb.auth.admin.listUsers();
  const USER_ID = authUsers?.users?.find(u => u.email === ADMIN_EMAIL)?.id;
  if (!USER_ID) throw new Error(`Utilisateur ${ADMIN_EMAIL} introuvable`);

  const { data: leasers } = await sb.from('leasers').select('id, name').eq('company_id', COMPANY_ID);
  const leaserByName = Object.fromEntries((leasers||[]).map(l => [l.name.toLowerCase(), l.id]));

  const { data: billingEntities } = await sb.from('billing_entities').select('id, name').eq('company_id', COMPANY_ID);
  const billingByName = Object.fromEntries((billingEntities||[]).map(b => [b.name.toLowerCase(), b.id]));

  // ── Vérifier quels dossiers existent déjà en DB ───────────────────────────
  const allDossierNumbers = dossiers.map(d => d.dossier_number);
  const { data: existingOffers } = await sb
    .from('offers')
    .select('id, dossier_number, client_name, financed_amount, created_at, remarks')
    .in('dossier_number', allDossierNumbers);

  const existingByDossier = {};
  for (const o of (existingOffers || [])) {
    if (!existingByDossier[o.dossier_number]) existingByDossier[o.dossier_number] = [];
    existingByDossier[o.dossier_number].push(o);
  }

  const toImport = dossiers.filter(d => !existingByDossier[d.dossier_number]);
  const skipped  = dossiers.filter(d =>  existingByDossier[d.dossier_number]);

  console.log(`\n  Déjà en DB (skip): ${skipped.length} dossiers`);
  for (const d of skipped) {
    const ex = existingByDossier[d.dossier_number];
    const tag = ex[0].remarks?.includes('[import-') ? '[import]' : '[original]';
    console.log(`    🔒 ${d.dossier_number.padEnd(20)} ${tag} — ${ex.map(o=>`${o.client_name} ${(o.financed_amount||0).toFixed(2)}€`).join(' | ')}`);
  }
  console.log(`\n  À importer       : ${toImport.length} dossiers`);

  // ── Vérification CA par mois (DB existante + à importer vs référence) ─────
  // IMPORTANT: Pour les dossiers déjà en DB, utiliser le mois du DATASET (date_facture)
  // et non created_at (qui peut être la date de saisie manuelle, pas la date de facture)
  console.log('\n' + '─'.repeat(70));
  console.log('📊 Vérification CA par mois (existant DB + import prévu vs référence):\n');

  // Dataset lookup: dossier_number → month_invoice (source of truth)
  const datasetMonthLookup = Object.fromEntries(allDossiers.map(d => [d.dossier_number, { month: d.month_invoice, ca: d.ca }]));

  // CA des dossiers déjà en DB : utiliser le mois du dataset, pas created_at
  const caByMonth = {};
  for (const d of skipped) {
    const m = d.month_invoice;
    caByMonth[m] = (caByMonth[m] || 0) + d.ca;
  }

  // CA des dossiers à importer
  const importByMonth = {};
  for (const d of toImport) {
    importByMonth[d.month_invoice] = (importByMonth[d.month_invoice] || 0) + d.ca;
  }

  // CA des dossiers protégés existants NON dans le dataset (ex: 180-18263, 180-17873 pour Février)
  // Ces dossiers sont en DB mais ne font pas partie du dataset → écart attendu documenté
  const FEB_PROTECTED_CA = 49788.67; // 180-18263 + 180-17873 (iTakecare PP, déjà en DB)
  const PROTECTED_BY_MONTH = { 2: FEB_PROTECTED_CA };

  let allOk = true;
  for (let m = 1; m <= 12; m++) {
    const db_ca       = caByMonth[m] || 0;
    const imp_ca      = importByMonth[m] || 0;
    const protected_ca = PROTECTED_BY_MONTH[m] || 0;
    const total       = db_ca + imp_ca + protected_ca;
    const ref         = REF_CA[m];
    const diff        = total - ref;
    const ok = Math.abs(diff) < 0.10;
    if (!ok) allOk = false;
    const status = ok ? '✅' : `❌ diff=${diff.toFixed(2)}€`;
    const protNote = protected_ca > 0 ? `  +protégé=${protected_ca.toFixed(2).padStart(10)}€` : '';
    if (total > 0 || ref > 0) {
      console.log(`  ${MOIS[m].padEnd(12)} DB=${db_ca.toFixed(2).padStart(10)}€  +import=${imp_ca.toFixed(2).padStart(10)}€${protNote}  =total=${total.toFixed(2).padStart(10)}€  réf=${ref.toFixed(2).padStart(10)}€  ${status}`);
    }
  }
  if (!allOk) {
    console.log('\n  ℹ️  Note: Février a 2 dossiers protégés (180-18263, 180-17873) ajoutés manuellement hors dataset.');
  }
  console.log('');
  if (!allOk && !DRY_RUN) {
    console.log('⚠️  Certains mois ne correspondent pas à la référence.');
    console.log('   L\'import continue quand même — vérifiez après import.\n');
  }

  if (DRY_RUN) {
    console.log('─'.repeat(70));
    console.log('\n📋 Dossiers à importer (dry-run):');
    for (const d of toImport) {
      console.log(`  ${d.dossier_number.padEnd(20)} ${MOIS[d.month_invoice].padEnd(11)} CA=${d.ca.toFixed(2).padStart(10)}€  Achat=${d.achat.toFixed(2).padStart(10)}€  Marge=${d.marge.toFixed(2).padStart(10)}€  ${d.client_name||d.client_company||''}`);
    }
    console.log(`\nℹ️  DRY-RUN — relancer sans --dry-run pour importer réellement.`);
    return;
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const batchId = `import-2023-excel-${new Date().toISOString().slice(0,19).replace(/[^0-9]/g,'')}`;
  const manifest = { batch_id: batchId, created_at: new Date().toISOString(), offers: [], offer_equipment: [], contract_equipment: [], contracts: [], invoices: [], errors: [] };

  console.log('─'.repeat(70));
  console.log(`\n🏷️  Batch: ${batchId}`);
  console.log('\n📥 Import...\n' + '─'.repeat(70));

  let nOffers=0, nContracts=0, nInvoices=0, nContractEq=0, nErrors=0;

  for (const d of toImport) {
    try {
      const leaserId   = leaserByName[(d.leaser_name||'').toLowerCase()] || null;
      const billingId  = billingByName[(d.leaser_name||'').toLowerCase()] || null;
      const clientName = d.client_name || d.client_company || '';
      const equipDescr = d.equipment.map(e=>`${e.qty}x ${e.title}`).join(' | ');

      // ─ Offer ─
      const { data: offer, error: offErr } = await sb.from('offers').insert({
        company_id: COMPANY_ID,
        user_id: USER_ID,
        client_id: d.client_id || null,
        client_name: clientName,
        status: 'accepted',
        workflow_status: 'financed',
        converted_to_contract: true,
        dossier_number: d.dossier_number,
        request_date: d.date_dossier,
        created_at: d.date_dossier,
        updated_at: d.date_dossier,
        amount: d.ca,
        financed_amount: d.ca,
        monthly_payment: d.mensualite,
        contract_duration: d.contract_duration || 48,
        leaser_id: leaserId,
        billing_entity_id: billingId,
        source: d.source || null,
        equipment_description: equipDescr || null,
        remarks: [d.notes, `[${batchId}]`].filter(Boolean).join(' | '),
      }).select('id').single();
      if (offErr) throw new Error(`offers: ${offErr.message}`);
      manifest.offers.push(offer.id);
      nOffers++;

      // ─ Equipment (avec S/N depuis PDFs Grenke) ─
      const grenkeInvoice = grenkeByDossier[d.dossier_number];
      const usedSNs = new Set();
      let snCount = 0;

      // Totaux pour calcul proportionnel
      const totalAchat = d.achat > 0
        ? d.achat
        : d.equipment.reduce((s, eq) => s + (eq.purchase_price || 0) * (eq.qty || 1), 0);
      // Ratio CA/Achat pour corriger les prix de vente aberrants
      const caAchatRatio = totalAchat > 0 ? d.ca / totalAchat : 1;

      // Helper: corrige le prix de vente unitaire si aberrant (0 ou < achat × 50%)
      const fixSellingPrice = (purchasePrice, sellingPrice) => {
        if (!purchasePrice || purchasePrice <= 0) return sellingPrice || 0;
        if (!sellingPrice || sellingPrice < purchasePrice * 0.5) {
          return Math.round(purchasePrice * caAchatRatio * 100) / 100;
        }
        return sellingPrice;
      };

      // Construire les lignes équipement (disponibles aussi pour billing_data plus bas)
      const eqRows = d.equipment.map(e => {
        const snMatch = findSerialNumber(e.title, grenkeInvoice?.equipment || [], usedSNs);
        const serialNumber = snMatch?.serial_number || null;
        if (serialNumber) { usedSNs.add(serialNumber); snCount++; }

        const eqAchat = (e.purchase_price || 0) * (e.qty || 1);
        const proportionalMonthly = totalAchat > 0
          ? Math.round((eqAchat / totalAchat) * d.mensualite * 100) / 100
          : 0;
        const sellingPrice = fixSellingPrice(e.purchase_price || 0, e.selling_price || 0);
        const margin = sellingPrice > 0 && (e.purchase_price || 0) > 0
          ? Math.round((sellingPrice - e.purchase_price) / sellingPrice * 100)
          : 0;

        return {
          offer_id: offer.id,
          title: e.title,
          quantity: e.qty,
          purchase_price: e.purchase_price || 0,
          selling_price: sellingPrice,
          duration: d.contract_duration || 48,
          margin,
          monthly_payment: proportionalMonthly,
          serial_number: serialNumber,
          order_status: 'received',
          created_at: d.date_dossier,
          updated_at: d.date_dossier,
        };
      });

      if (eqRows.length > 0) {
        const { data: eqInserted, error: eqErr } = await sb.from('offer_equipment').insert(eqRows).select('id');
        if (eqErr) console.warn(`  ⚠️  Equipment ${d.dossier_number}: ${eqErr.message}`);
        else {
          manifest.offer_equipment.push(...eqInserted.map(r=>r.id));
          if (snCount > 0) console.log(`    🔢 ${snCount} S/N attaché(s) depuis PDF`);
        }
      }

      // ─ Contract ─
      const { data: contract, error: ctErr } = await sb.from('contracts').insert({
        company_id: COMPANY_ID,
        user_id: USER_ID,
        offer_id: offer.id,
        client_id: d.client_id || null,
        client_name: clientName,
        status: 'active',
        created_at: d.date_dossier,
        updated_at: d.date_dossier,
        monthly_payment: d.mensualite,
        leaser_name: d.leaser_name || '',
        leaser_id: leaserId,
        billing_entity_id: billingId,
        contract_number: d.contract_number || null,
        contract_start_date: d.date_dossier,
        contract_duration: d.contract_duration || 48,
        dossier_date: d.date_dossier,
        equipment_description: equipDescr || null,
        invoice_generated: !!d.invoice_number,
        invoice_date: d.date_facture,
        payment_date: d.date_paiement,
        special_provisions: d.notes || null,
      }).select('id').single();
      if (ctErr) throw new Error(`contracts: ${ctErr.message}`);
      manifest.contracts.push(contract.id);
      nContracts++;

      // ─ Contract Equipment (nécessaire pour le dashboard achats par mois) ─
      // Le dashboard useCompanyDashboard.ts calcule les achats mensuels depuis contract_equipment
      // (pas offer_equipment) en filtrant sur actual_purchase_date / order_date
      if (d.equipment.length > 0) {
        // Schéma contract_equipment (src/integrations/supabase/types.ts):
        // contract_id, title, quantity, purchase_price, actual_purchase_price,
        // actual_purchase_date, order_date, order_status, margin, monthly_payment,
        // serial_number, created_at, updated_at
        // ⚠️ PAS de selling_price ni duration dans cette table

        // Normalisation : actual_purchase_price est normalisé pour que
        // sum(actual_purchase_price * quantity) = d.achat (valeur de référence)
        // Les prix bruts du dataset peuvent diverger du montant de référence
        // (ex: 180-18228 equip_sum=24707€ vs achat_ref=2845€)
        const equipmentRawTotal = d.equipment.reduce(
          (s, eq) => s + (eq.purchase_price || 0) * (eq.qty || 1), 0
        );
        const achatNormRatio = (d.achat > 0 && equipmentRawTotal > 0)
          ? d.achat / equipmentRawTotal : 1;

        const ceRows = eqRows.map(e => ({
          contract_id: contract.id,
          title: e.title,
          quantity: e.quantity,
          purchase_price: e.purchase_price,
          actual_purchase_price: Math.round((e.purchase_price || 0) * achatNormRatio * 100) / 100,
          actual_purchase_date: d.date_facture,   // ← clé: attribue l'achat au bon mois
          order_date: d.date_dossier,
          order_status: 'received',
          margin: e.margin,
          monthly_payment: e.monthly_payment,
          serial_number: e.serial_number || null,
          created_at: d.date_dossier,
          updated_at: d.date_dossier,
        }));

        const { data: ceInserted, error: ceErr } = await sb.from('contract_equipment').insert(ceRows).select('id');
        if (ceErr) console.warn(`  ⚠️  contract_equipment ${d.dossier_number}: ${ceErr.message}`);
        else {
          manifest.contract_equipment.push(...ceInserted.map(r=>r.id));
          nContractEq += ceInserted.length;
        }
      }

      // ─ Invoice ─
      if (d.invoice_number) {
        const leaserKey = (d.leaser_name || '').toLowerCase();
        const leaserData = LEASER_REGISTRY[leaserKey] || {
          name: d.leaser_name || '',
          address: '', city: '', postal_code: '', country: 'Belgique', vat_number: '', email: '', phone: '',
        };

        const billingData = {
          // Compatibilité legacy
          client_name: clientName,
          client_id: d.client_id || null,
          dossier_number: d.dossier_number,

          // Bailleur (affiché dans "Informations du bailleur")
          leaser_data: leaserData,

          // Contrat & offre
          contract_data: {
            id: contract.id,
            offer_id: offer.id,
            client_name: clientName,
            client_email: '',
            status: 'active',
            created_at: d.date_dossier,
            dossier_number: d.dossier_number,
            contract_number: d.contract_number || null,
          },

          // Équipements avec numéros de série et prix
          equipment_data: eqRows.map(e => ({
            title: e.title,
            serial_number: e.serial_number || '',
            quantity: e.quantity,
            purchase_price: e.purchase_price,
            selling_price_excl_vat: e.selling_price,
            monthly_payment: e.monthly_payment,
            margin: e.margin,
          })),

          // Totaux facture (CA = HTVA, TVA 21%)
          invoice_totals: {
            total_excl_vat: d.ca,
            vat_rate: 0.21,
            vat_amount: Math.round(d.ca * 0.21 * 100) / 100,
            total_incl_vat: Math.round(d.ca * 1.21 * 100) / 100,
          },
        };

        const { data: inv, error: invErr } = await sb.from('invoices').insert({
          company_id: COMPANY_ID,
          offer_id: offer.id,
          contract_id: contract.id,
          invoice_number: d.invoice_number,
          invoice_date: d.date_facture,
          created_at: d.date_facture,
          updated_at: d.date_facture,
          invoice_type: 'leasing',
          integration_type: 'manual',
          leaser_name: d.leaser_name || '',
          amount: d.ca,
          status: d.date_paiement ? 'paid' : 'draft',
          paid_at: d.date_paiement || null,
          billing_data: billingData,
        }).select('id').single();
        if (invErr) console.warn(`  ⚠️  Invoice ${d.dossier_number}: ${invErr.message}`);
        else { manifest.invoices.push(inv.id); nInvoices++; }
      }

      const tag = d.source_data === 'csv' ? '[CSV]' : '[XLS]';
      console.log(`  ✅ ${tag} ${d.dossier_number.padEnd(18)} ${MOIS[d.month_invoice].padEnd(10)} CA=${d.ca.toFixed(2).padStart(10)}€  ${clientName.slice(0,30)}`);

    } catch(err) {
      nErrors++;
      manifest.errors.push({ dossier: d.dossier_number, error: err.message });
      console.error(`  ❌ ${d.dossier_number}: ${err.message}`);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // ── Vérification finale ───────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('📊 Vérification finale CA par mois:\n');

  const { data: finalOffers } = await sb
    .from('offers')
    .select('dossier_number, financed_amount, created_at, workflow_status')
    .eq('company_id', COMPANY_ID)
    .in('workflow_status', ['financed','accepted','validated','contract_sent','signed','contract_signed'])
    .gte('created_at', '2023-01-01')
    .lte('created_at', '2023-12-31');

  // Also check all offers with dossier_numbers from dataset
  const { data: finalByDossier } = await sb
    .from('offers')
    .select('id, dossier_number, financed_amount, created_at')
    .in('dossier_number', allDossierNumbers);

  // Group by invoice month using dataset month (more reliable than created_at)
  const datasetMonth = Object.fromEntries(allDossiers.map(d => [d.dossier_number, d.month_invoice]));
  const finalCA = {};
  for (const o of (finalByDossier||[])) {
    const m = datasetMonth[o.dossier_number];
    if (m) finalCA[m] = (finalCA[m]||0) + (o.financed_amount||0);
  }

  // Vérification achats depuis contract_equipment (comme le dashboard)
  // Utilise actual_purchase_price (normalisé) + actual_purchase_date pour grouper par mois
  const contractIds = (finalByDossier||[]).map(o => o._contractId).filter(Boolean);

  // Récupérer les contract_ids depuis les contrats liés aux offres du dataset
  const offerIds = (finalByDossier||[]).map(o => o.id).filter(Boolean);
  const { data: finalContracts } = await sb
    .from('contracts')
    .select('id, offer_id')
    .in('offer_id', offerIds);

  const offerToContractId = Object.fromEntries((finalContracts||[]).map(c => [c.offer_id, c.id]));
  const contractToMonth = {};
  for (const o of (finalByDossier||[])) {
    const cId = offerToContractId[o.id];
    if (cId) contractToMonth[cId] = datasetMonth[o.dossier_number];
  }

  const allContractIds = Object.keys(contractToMonth);
  const { data: finalCE } = allContractIds.length > 0
    ? await sb.from('contract_equipment')
        .select('contract_id, actual_purchase_price, purchase_price, actual_purchase_date, quantity')
        .in('contract_id', allContractIds)
    : { data: [] };

  const finalMarge = {};
  for (const eq of (finalCE||[])) {
    // Grouper par mois de actual_purchase_date (comme le dashboard)
    const dateStr = eq.actual_purchase_date;
    if (!dateStr) continue;
    const month = new Date(dateStr).getMonth() + 1;
    if (month < 1 || month > 12) continue;
    const price = eq.actual_purchase_price ?? eq.purchase_price ?? 0;
    finalMarge[month] = (finalMarge[month] || 0) + price * (eq.quantity || 1);
  }

  let allGood = true;
  for (let m = 1; m <= 12; m++) {
    const totalCA = finalCA[m] || 0;
    const totalAchat = finalMarge[m] || 0;
    const totalMarge = totalCA - totalAchat;
    const refCA = REF_CA[m];
    const refMarge = REF_MARGE[m];
    const diffCA = totalCA - refCA;
    const diffMarge = totalMarge - refMarge;
    const okCA = Math.abs(diffCA) < 0.05;
    const okMarge = Math.abs(diffMarge) < 1; // marge: tolérance 1€ (arrondis)
    if (!okCA) allGood = false;
    if (totalCA > 0 || refCA > 0) {
      const statusCA = okCA ? '✅' : `❌ diff=${diffCA.toFixed(2)}€`;
      const statusM  = okMarge ? '✅' : `⚠️  diff=${diffMarge.toFixed(2)}€`;
      console.log(`  ${MOIS[m].padEnd(12)} CA=${totalCA.toFixed(2).padStart(10)}€ (réf ${refCA.toFixed(2).padStart(10)}€) ${statusCA}  Marge=${totalMarge.toFixed(2).padStart(9)}€ (réf ${refMarge.toFixed(2).padStart(9)}€) ${statusM}`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`✅  Offres           : ${nOffers}`);
  console.log(`✅  Contrats         : ${nContracts}`);
  console.log(`✅  Factures         : ${nInvoices}`);
  console.log(`✅  Contract Equip.  : ${nContractEq}`);
  if (nErrors) console.log(`❌  Erreurs          : ${nErrors}`);
  console.log(allGood ? '\n🎉 Tous les mois correspondent à la référence !' : '\n⚠️  Certains mois ont des écarts — voir détail ci-dessus.');
  console.log(`\n💾 Manifest : ${MANIFEST_PATH}`);
  console.log(`🔄 Rollback : node scripts/import-2023-excel.js rollback`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
