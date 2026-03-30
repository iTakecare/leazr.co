/**
 * match-clients-2024.js
 *
 * Pour chaque facture leasing 2024 :
 *  1. Récupère offer.client_id → clients.name + clients.company
 *  2. Compare avec billing_data.contract_data.client_name actuel
 *  3. Produit un rapport et optionnellement met à jour billing_data
 *
 * Usage :
 *   node scripts/match-clients-2024.js            → rapport seulement
 *   node scripts/match-clients-2024.js --update   → met à jour en DB
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const args   = process.argv.slice(2);
const UPDATE = args.includes('--update');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔍 MATCHING CLIENTS 2024 ${UPDATE ? '[UPDATE]' : '[RAPPORT]'}\n`);

  // 1. Récupérer toutes les factures leasing 2024
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, invoice_number, offer_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2024-12-31')
    .order('invoice_number');

  // 2. Récupérer les offers avec client_id
  const offerIds = [...new Set(invoices.map(i => i.offer_id).filter(Boolean))];
  const { data: offers } = await sb
    .from('offers')
    .select('id, client_id, client_name, dossier_number')
    .in('id', offerIds);
  const offerMap = new Map((offers || []).map(o => [o.id, o]));

  // 3. Récupérer les clients
  const clientIds = [...new Set((offers || []).map(o => o.client_id).filter(Boolean))];
  const { data: clients } = clientIds.length > 0
    ? await sb.from('clients').select('id, name, company, email, first_name, last_name').in('id', clientIds)
    : { data: [] };
  const clientMap = new Map((clients || []).map(c => [c.id, c]));

  console.log(`${'Invoice'.padEnd(20)} | ${'Nom actuel billing_data'.padEnd(35)} | ${'Nom DB (clients table)'.padEnd(35)} | ${'Entreprise DB'.padEnd(30)} | Statut`);
  console.log('─'.repeat(145));

  const toUpdate = [];
  const needsReview = [];

  for (const inv of invoices) {
    const currentName = inv.billing_data?.contract_data?.client_name
      || inv.billing_data?.client_name || '(vide)';

    const offer = offerMap.get(inv.offer_id);
    if (!offer) {
      console.log(`${inv.invoice_number.padEnd(20)} | ${currentName.padEnd(35)} | ${'(pas d\'offer_id)'.padEnd(35)} | ${''.padEnd(30)} | ⚠️  pas d'offer`);
      needsReview.push({ inv, currentName, reason: 'pas d\'offer_id' });
      continue;
    }

    const client = clientMap.get(offer.client_id);
    if (!client) {
      console.log(`${inv.invoice_number.padEnd(20)} | ${currentName.padEnd(35)} | ${'(client_id null/manquant)'.padEnd(35)} | ${''.padEnd(30)} | ⚠️  pas de client`);
      needsReview.push({ inv, offer, currentName, reason: 'pas de client en DB' });
      continue;
    }

    const dbName    = client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim();
    const dbCompany = client.company || '';
    const isSame    = currentName.toLowerCase().trim() === dbName.toLowerCase().trim();

    const status = isSame ? '✅' : '🔄 à corriger';
    console.log(`${inv.invoice_number.padEnd(20)} | ${currentName.padEnd(35)} | ${dbName.padEnd(35)} | ${dbCompany.padEnd(30)} | ${status}`);

    if (!isSame) {
      toUpdate.push({
        invoiceId: inv.id,
        invoice_number: inv.invoice_number,
        currentName,
        dbName,
        dbCompany,
        client,
        billing_data: inv.billing_data,
      });
    }
  }

  console.log('─'.repeat(145));
  console.log(`\n  ✅ Déjà corrects       : ${invoices.length - toUpdate.length - needsReview.length}`);
  console.log(`  🔄 À corriger          : ${toUpdate.length}`);
  console.log(`  ⚠️  À réviser manuell. : ${needsReview.length}`);

  if (needsReview.length > 0) {
    console.log('\n  ⚠️  CAS À RÉVISER :');
    for (const r of needsReview) {
      console.log(`    ${r.inv.invoice_number} | "${r.currentName}" → ${r.reason}`);
      if (r.offer) console.log(`      offer.client_id=${r.offer.client_id || 'null'} | offer.client_name="${r.offer.client_name}"`);
    }
  }

  if (!UPDATE) {
    console.log('\n  → Relance avec --update pour appliquer les corrections\n');
    return;
  }

  // 4. Appliquer les mises à jour
  console.log(`\n🔧 APPLICATION DES CORRECTIONS (${toUpdate.length})\n`);
  let nUpdated = 0;

  for (const u of toUpdate) {
    const newBillingData = {
      ...(u.billing_data || {}),
      contract_data: {
        ...(u.billing_data?.contract_data || {}),
        client_name:    u.dbName,
        client_company: u.dbCompany,
      },
      client_name: u.dbName,
    };

    const { error } = await sb.from('invoices').update({
      billing_data: newBillingData,
      updated_at:   new Date().toISOString(),
    }).eq('id', u.invoiceId);

    if (error) {
      console.log(`  ❌ ${u.invoice_number}: ${error.message}`);
    } else {
      console.log(`  ✅ ${u.invoice_number}: "${u.currentName}" → "${u.dbName}" (${u.dbCompany})`);
      nUpdated++;
    }
  }

  console.log(`\n  Mis à jour: ${nUpdated} / ${toUpdate.length}\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
