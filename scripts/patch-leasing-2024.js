/**
 * patch-leasing-2024.js
 *
 * Corrige les factures leasing 2024 importées :
 *   1. billing_data → ajoute contract_data.client_name (lu par InvoicingPage)
 *   2. Crée les enregistrements contract_equipment (lus par le dashboard pour Achats/Marge)
 *
 * ⚠️ À exécuter depuis le Mac :
 *   node scripts/patch-leasing-2024.js --dry-run
 *   node scripts/patch-leasing-2024.js
 */

import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔧 PATCH LEASING 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);

  // ── 1. Récupérer toutes les factures leasing 2024
  const { data: invoices, error: invErr } = await sb
    .from('invoices')
    .select('id, invoice_number, billing_data, offer_id, contract_id, amount')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2025-12-31'); // inclure aussi celles avec dates 2025

  if (invErr) throw new Error('Invoices: ' + invErr.message);
  console.log(`\n📄 ${invoices.length} factures leasing trouvées`);

  // ── 2. Récupérer les offres liées (pour client_name + offer_equipment)
  const offerIds = [...new Set(invoices.map(i => i.offer_id).filter(Boolean))];
  const { data: offers, error: offerErr } = await sb
    .from('offers')
    .select('id, client_id, client_name, dossier_number, financed_amount, amount, contract_duration')
    .in('id', offerIds);
  if (offerErr) throw new Error('Offers: ' + offerErr.message);
  const offerMap = new Map(offers.map(o => [o.id, o]));

  // ── 3. Récupérer les clients liés
  const clientIds = [...new Set(offers.map(o => o.client_id).filter(Boolean))];
  let clientMap = new Map();
  if (clientIds.length > 0) {
    const { data: clients } = await sb
      .from('clients')
      .select('id, name, company, email, phone, vat_number, billing_address, billing_city, billing_postal_code, billing_country')
      .in('id', clientIds);
    clientMap = new Map((clients || []).map(c => [c.id, c]));
  }

  // ── 4. Récupérer offer_equipment pour les achats
  const { data: allEquip, error: eqErr } = await sb
    .from('offer_equipment')
    .select('id, offer_id, title, purchase_price, selling_price, quantity, margin, serial_number, duration')
    .in('offer_id', offerIds);
  if (eqErr) throw new Error('Equipment: ' + eqErr.message);
  const equipByOffer = new Map();
  for (const eq of allEquip || []) {
    if (!equipByOffer.has(eq.offer_id)) equipByOffer.set(eq.offer_id, []);
    equipByOffer.get(eq.offer_id).push(eq);
  }

  // ── 5. Vérifier quels contract_equipment existent déjà
  const contractIds = [...new Set(invoices.map(i => i.contract_id).filter(Boolean))];
  let existingContractEquip = new Set();
  if (contractIds.length > 0) {
    const { data: ce } = await sb
      .from('contract_equipment')
      .select('contract_id')
      .in('contract_id', contractIds);
    for (const e of ce || []) existingContractEquip.add(e.contract_id);
  }

  let patchedBilling = 0, createdEquip = 0, errors = 0;

  for (const inv of invoices) {
    const offer  = offerMap.get(inv.offer_id);
    if (!offer) { console.log(`  ⚠️  ${inv.invoice_number}: offer introuvable`); continue; }

    const client = clientMap.get(offer.client_id);
    const clientName    = offer.client_name || client?.company || client?.name || '';
    const clientCompany = client?.company || '';

    // ── A. Fix billing_data → contract_data.client_name
    const oldBD = inv.billing_data || {};
    const alreadyFixed = !!oldBD.contract_data?.client_name;

    const newBillingData = {
      ...oldBD,
      contract_data: {
        ...(oldBD.contract_data || {}),
        client_name:    clientName,
        client_company: clientCompany,
        client_id:      offer.client_id || null,
        dossier_number: oldBD.dossier_number || offer.dossier_number,
        leaser_name:    oldBD.leaser_name || null,
      },
      // Garde la rétrocompatibilité
      client_name: clientName,
      dossier_number: oldBD.dossier_number || offer.dossier_number,
    };

    console.log(`  ${alreadyFixed ? '✓' : '→'} ${inv.invoice_number?.padEnd(16)} | "${clientName}" | contract_id=${inv.contract_id ? inv.contract_id.slice(0,8) : 'NULL'}`);

    if (!DRY_RUN) {
      const { error } = await sb
        .from('invoices')
        .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      if (error) { console.error(`    ❌ billing_data: ${error.message}`); errors++; continue; }
      patchedBilling++;
    } else {
      patchedBilling++;
    }

    // ── B. Créer contract_equipment si contrat existe et pas encore d'équipements
    if (inv.contract_id && !existingContractEquip.has(inv.contract_id)) {
      const equipLines = equipByOffer.get(inv.offer_id) || [];
      if (equipLines.length === 0) {
        // Créer une ligne générique depuis le montant financé
        const fa = offer.financed_amount || offer.amount || inv.amount || 0;
        equipLines.push({
          title: offer.client_name ? `Équipement - ${offer.client_name}` : 'Équipement',
          purchase_price: fa * 0.85, // estimation si pas d'info
          selling_price: fa,
          quantity: 1,
        });
      }

      if (!DRY_RUN) {
        const rows = equipLines.map(eq => ({
          contract_id:    inv.contract_id,
          title:          eq.title,
          purchase_price: eq.purchase_price || 0,
          quantity:       eq.quantity || 1,
          margin:         eq.margin || 0,
          monthly_payment: 0,
        }));

        const { error: ceErr } = await sb.from('contract_equipment').insert(rows);
        if (ceErr) {
          console.error(`    ❌ contract_equipment: ${ceErr.message}`);
          errors++;
        } else {
          console.log(`    📦 ${rows.length} contract_equipment créés (PA total: ${rows.reduce((s,r)=>s+(r.purchase_price*r.quantity),0).toFixed(2)}€)`);
          createdEquip += rows.length;
          existingContractEquip.add(inv.contract_id);
        }
      } else {
        const paTot = equipLines.reduce((s,e)=>s+((e.purchase_price||0)*(e.quantity||1)),0);
        console.log(`    📦 [DRY] ${equipLines.length} contract_equipment à créer (PA: ${paTot.toFixed(2)}€)`);
        createdEquip += equipLines.length;
      }
    } else if (inv.contract_id && existingContractEquip.has(inv.contract_id)) {
      console.log(`    ✓ contract_equipment déjà présent`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  billing_data patchées : ${patchedBilling}`);
  console.log(`  contract_equipment    : ${createdEquip}`);
  console.log(`  erreurs               : ${errors}`);
  if (DRY_RUN) console.log('\n  (dry-run — aucune modification)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
