/**
 * diagnose-2024.js
 *
 * Analyse ce qui existe déjà en DB pour 2024 :
 * - Factures (invoices) 2024
 * - Offres (offers) 2024
 * - Contrats (contracts) 2024
 *
 * Usage : node scripts/diagnose-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('\n🔍 DIAGNOSTIC 2024 - Leazr DB\n');
  console.log('═'.repeat(70));

  // ── 1. FACTURES 2024 ──────────────────────────────────────────────────
  const { data: invoices, error: ie } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, invoice_type, amount, status, paid_at, offer_id, contract_id, leaser_name, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2024-12-31')
    .order('invoice_number');

  if (ie) throw new Error('Invoices: ' + ie.message);

  const leasing_invs = invoices.filter(i => i.invoice_type !== 'purchase');
  const purchase_invs = invoices.filter(i => i.invoice_type === 'purchase');

  console.log(`\n📄 FACTURES 2024 : ${invoices.length} total`);
  console.log(`   Leasing/standard : ${leasing_invs.length}`);
  console.log(`   Ventes directes  : ${purchase_invs.length}`);

  if (leasing_invs.length > 0) {
    console.log('\n   📋 Factures leasing existantes :');
    let totalLeasing = 0;
    for (const inv of leasing_invs) {
      const clientName = inv.billing_data?.contract_data?.client_name
        || inv.billing_data?.client_data?.name
        || inv.leaser_name || '?';
      totalLeasing += inv.amount || 0;
      console.log(`      ${inv.invoice_number?.padEnd(20)} | ${String(inv.amount || 0).padStart(10)}€ | ${inv.invoice_type} | client: ${clientName}`);
    }
    console.log(`   TOTAL leasing: ${totalLeasing.toFixed(2)}€`);
  }

  if (purchase_invs.length > 0) {
    console.log('\n   📋 Ventes directes existantes :');
    let totalPurchase = 0;
    for (const inv of purchase_invs) {
      const clientName = inv.billing_data?.client_data?.name
        || inv.billing_data?.client_name || '?';
      totalPurchase += inv.amount || 0;
      console.log(`      ${inv.invoice_number?.padEnd(20)} | ${String(inv.amount || 0).padStart(10)}€ | client: ${clientName}`);
    }
    console.log(`   TOTAL ventes directes: ${totalPurchase.toFixed(2)}€`);
  }

  // ── 2. OFFRES 2024 ────────────────────────────────────────────────────
  const { data: offers, error: oe } = await sb
    .from('offers')
    .select('id, offer_number, created_at, status, workflow_status, is_purchase, client_name, amount, converted_to_contract')
    .eq('company_id', COMPANY_ID)
    .gte('created_at', '2024-01-01')
    .lte('created_at', '2024-12-31')
    .order('created_at');

  if (oe) throw new Error('Offers: ' + oe.message);

  const purchase_offers = offers.filter(o => o.is_purchase);
  const leasing_offers  = offers.filter(o => !o.is_purchase);

  console.log(`\n📋 OFFRES/DEMANDES 2024 : ${offers.length} total`);
  console.log(`   Achats directs  : ${purchase_offers.length}`);
  console.log(`   Leasing demandes: ${leasing_offers.length}`);

  // ── 3. CONTRATS 2024 ─────────────────────────────────────────────────
  // Récupérer les contracts liés aux factures leasing 2024 (via contract_id sur les factures)
  const leasingContractIds = [...new Set(leasing_invs.map(i => i.contract_id).filter(Boolean))];
  const { data: contracts, error: ce } = leasingContractIds.length > 0
    ? await sb
        .from('contracts')
        .select('id, contract_number, leaser_name, client_name, monthly_payment, status, offer_id')
        .in('id', leasingContractIds)
    : { data: [], error: null };

  if (ce) throw new Error('Contracts: ' + ce.message);

  // Factures leasing sans contract_id
  const invWithoutContract = leasing_invs.filter(i => !i.contract_id);
  if (invWithoutContract.length > 0) {
    console.log(`\n  ⚠️  Factures leasing SANS contract_id : ${invWithoutContract.length}`);
    for (const i of invWithoutContract) console.log(`     ${i.invoice_number} | ${i.amount}€`);
  }

  // Get financed_amount from linked offers (défini ici pour rester accessible dans le bloc contract_equipment)
  let offerFAMap = new Map();
  if (contracts.length > 0) {
    const offerIds = contracts.map(c => c.offer_id).filter(Boolean);
    const { data: contractOffers } = offerIds.length > 0
      ? await sb.from('offers').select('id, financed_amount').in('id', offerIds)
      : { data: [] };
    offerFAMap = new Map((contractOffers || []).map(o => [o.id, o.financed_amount]));
  }

  console.log(`\n📑 CONTRATS liés aux factures 2024 : ${contracts.length}`);
  if (contracts.length > 0) {
    let totalFA = 0;
    for (const c of contracts) {
      const fa = offerFAMap.get(c.offer_id) || 0;
      totalFA += fa;
      console.log(`   ${c.contract_number?.padEnd(15)} | FA=${String(fa).padStart(10)}€ | ${c.leaser_name} | ${c.client_name}`);
    }
    console.log(`   TOTAL financed_amount: ${totalFA.toFixed(2)}€`);
  }

  // ── 4. CONTRACT_EQUIPMENT 2024 ────────────────────────────────────────
  console.log('\n🔧 CONTRACT_EQUIPMENT pour contrats 2024 :');
  if (contracts.length > 0) {
    const contractIds = contracts.map(c => c.id);
    const { data: ceRows, error: ceErr } = await sb
      .from('contract_equipment')
      .select('contract_id, title, quantity, purchase_price, margin, monthly_payment')
      .in('contract_id', contractIds);

    if (ceErr) {
      console.log('   ❌ Erreur contract_equipment:', ceErr.message);
    } else {
      const contractsWithEq = new Set(ceRows.map(r => r.contract_id));
      const contractsWithout = contracts.filter(c => !contractsWithEq.has(c.id));

      let totalPA = 0;
      let totalMarge = 0;
      for (const row of ceRows) {
        const qty = row.quantity || 1;
        totalPA    += (row.purchase_price || 0) * qty;
        totalMarge += (row.margin || 0) * qty;
      }

      console.log(`   Lignes contract_equipment : ${ceRows.length}`);
      console.log(`   Contrats avec équipement  : ${contractsWithEq.size} / ${contracts.length}`);
      console.log(`   Total PA (purchase_price) : ${totalPA.toFixed(2)}€   (réf: 189,371.48€)`);
      console.log(`   Total Marge               : ${totalMarge.toFixed(2)}€   (réf: 123,282.36€)`);

      if (contractsWithout.length > 0) {
        console.log(`\n   ⚠️  Contrats SANS contract_equipment (${contractsWithout.length}) :`);
        for (const c of contractsWithout) {
          const fa = offerFAMap.get(c.offer_id) || 0;
          console.log(`      ${c.contract_number?.padEnd(15)} | FA=${fa}€ | ${c.client_name}`);
        }
      }
    }
  }

  // ── 5. VENTES DIRECTES - PURCHASE PRICES ─────────────────────────────
  console.log('\n🛒 VENTES DIRECTES - PRIX D\'ACHAT :');
  if (purchase_invs.length > 0) {
    // Get offer_equipment for direct sales offers
    const dsOfferIds = purchase_invs.map(i => i.offer_id).filter(Boolean);
    if (dsOfferIds.length > 0) {
      const { data: dsEquip } = await sb
        .from('offer_equipment')
        .select('offer_id, purchase_price, quantity')
        .in('offer_id', dsOfferIds);

      let totalDSPA = 0;
      const offerEqMap = new Map();
      for (const eq of (dsEquip || [])) {
        const cur = offerEqMap.get(eq.offer_id) || 0;
        offerEqMap.set(eq.offer_id, cur + (eq.purchase_price || 0) * (eq.quantity || 1));
        totalDSPA += (eq.purchase_price || 0) * (eq.quantity || 1);
      }

      const offerIdsWithEquip = new Set((dsEquip || []).map(e => e.offer_id));
      const invWithoutPA = purchase_invs.filter(i => !offerIdsWithEquip.has(i.offer_id));
      console.log(`   Offres avec offer_equipment : ${offerIdsWithEquip.size} / ${purchase_invs.length}`);
      console.log(`   Total PA ventes directes    : ${totalDSPA.toFixed(2)}€   (réf: 15,573.01€)`);
      if (invWithoutPA.length > 0) {
        console.log(`   ⚠️  Factures SANS prix d'achat (${invWithoutPA.length}) :`);
        for (const i of invWithoutPA) console.log(`      ${i.invoice_number} | ${i.amount}€`);
      }
    }
  }

  // ── 6. RÉSUMÉ ─────────────────────────────────────────────────────────
  // ── Marge ventes directes ─────────────────────────────────────────────
  // Pour ventes directes: récupérer aussi les factures avec invoice_date en 2025 mais ITC-2024-XXXX
  const { data: inv2025 } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, invoice_type')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'purchase')
    .gte('invoice_date', '2025-01-01')
    .lte('invoice_date', '2025-12-31')
    .like('invoice_number', 'ITC-2024-%');

  if (inv2025?.length) {
    console.log(`\n  ℹ️  Factures ITC-2024-XXX avec date 2025 (${inv2025.length}) :`);
    for (const i of inv2025) console.log(`     ${i.invoice_number} | ${i.invoice_date} | ${i.amount}€`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 RÉSUMÉ COMPARAISON vs TABLEAUX RÉFÉRENCE');
  const caLeasing = leasing_invs.reduce((s,i) => s + (i.amount||0), 0);
  const caVentes  = purchase_invs.reduce((s,i) => s + (i.amount||0), 0);
  console.log(`   CA leasing en DB       : ${caLeasing.toFixed(2)}€   (réf: 312,653.84€)  ${Math.abs(caLeasing - 312653.84) < 0.1 ? '✅' : `❌ écart ${(caLeasing - 312653.84).toFixed(2)}€`}`);
  console.log(`   Ventes directes en DB  : ${caVentes.toFixed(2)}€   (réf: 19,214.07€)  ${Math.abs(caVentes - 19214.07) < 0.1 ? '✅' : `❌ écart ${(caVentes - 19214.07).toFixed(2)}€`}`);

  // ── 7. INVOICE NUMBERS MANQUANTS (vs CSV) ─────────────────────────────
  const existingInvNums = new Set(invoices.map(i => i.invoice_number));

  // Expected invoice numbers from CSV (leasing)
  const csvLeasingNums = [
    'ITC-2024-0002','ITC-2024-0003','ITC-2024-0004','ITC-2024-0005','ITC-2024-0006',
    'ITC-2024-0007','ITC-2024-0009','ITC-2024-0010','ITC-2024-0011','ITC-2024-0012',
    'ITC-2024-0013','ITC-2024-0016','ITC-2024-0017','ITC-2024-0018','ITC-2024-0019',
    'ITC-2024-0020','ITC-2024-0021','ITC-2024-0028','ITC-2024-0029','ITC-2024-0030',
    'ITC-2024-0031','ITC-2024-0033','ITC-2024-0035','ITC-2024-0036','ITC-2024-0039',
    'ITC-2024-0040','ITC-2024-0043','ITC-2024-0044','ITC-2024-0045','ITC-2024-0049',
    'ITC-2024-0050','ITC-2024-0055','ITC-2024-0056','ITC-2024-0057','ITC-2024-0063',
    'ITC-2024-0064','ITC-2024-0068','ITC-2024-0070','ITC-2024-0071','ITC-2024-0073',
    'ITC-2024-0074','ITC-2024-0080','ITC-2024-0081','ITC-2024-0082','ITC-2024-0083',
    'ITC-2024-0084','ITC-2024-0085','ITC-2024-0086','ITC-2024-0089','ITC-2024-0090',
    'ITC-2024-0104','ITC-2024-0108','ITC-2024-0109','ITC-2024-0110','ITC-2024-0111',
    'ITC-2024-0112','ITC-2024-0114','ITC-2024-0115','ITC-2024-0117','ITC-2024-0121',
    'ITC-2014-0116'
  ];

  const missingLeasing = csvLeasingNums.filter(n => !existingInvNums.has(n));
  console.log(`\n   Leasing du CSV manquants en DB : ${missingLeasing.length}`);
  if (missingLeasing.length > 0) console.log('  ', missingLeasing.join(', '));

  // Expected direct sales from reference table
  const refDirectSales = [
    'ITC-2024-0001','ITC-2024-0008','ITC-2024-0014','ITC-2024-0015',
    'ITC-2024-0022','ITC-2024-0023','ITC-2024-0024','ITC-2024-0025',
    'ITC-2024-0026','ITC-2024-0027','ITC-2024-0032','ITC-2024-0034',
    'ITC-2024-0041','ITC-2024-0042','ITC-2024-0046','ITC-2024-0047',
    'ITC-2024-0048','ITC-2024-0052','ITC-2024-0053','ITC-2024-0054',
    'ITC-2024-0058','ITC-2024-0059','ITC-2024-0060','ITC-2024-0061',
    'ITC-2024-0062','ITC-2024-0065','ITC-2024-0066','ITC-2024-0067',
    'ITC-2024-0069','ITC-2024-0072','ITC-2024-0075','ITC-2024-0076',
    'ITC-2024-0077','ITC-2024-0078','ITC-2024-0079','ITC-2024-0087',
    'ITC-2024-0088','ITC-2024-0091','ITC-2024-0092','ITC-2024-0093',
    'ITC-2024-0094','ITC-2024-0095','ITC-2024-0096','ITC-2024-0097',
    'ITC-2024-0098','ITC-2024-0099','ITC-2024-0100','ITC-2024-0101',
    'ITC-2024-0102','ITC-2024-0113','ITC-2024-0119','ITC-2024-0120',
  ];

  const missingDS = refDirectSales.filter(n => !existingInvNums.has(n));
  console.log(`\n   Ventes directes manquantes en DB : ${missingDS.length}`);
  if (missingDS.length > 0) console.log('  ', missingDS.join(', '));

  console.log('\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
