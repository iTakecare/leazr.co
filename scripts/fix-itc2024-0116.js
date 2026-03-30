/**
 * fix-itc2024-0116.js
 *
 * Corrige la facture ITC-2014-0116 (mauvais numéro d'année dans la DB) :
 *  1. Renomme invoice_number: ITC-2014-0116 → ITC-2024-0116
 *  2. Trouve le client "Mamy Home" en DB
 *  3. Met à jour billing_data complet (leaser + contrat + équipements + SN)
 *  4. Met à jour contract_equipment.title
 *
 * Équipement (PDF) :
 *   Galaxy Xcover 7 Enterprise Edition 256Go × 10 @ €411,59
 *   Dossier : 180-25672   Date : 25/12/2024
 *   10 numéros de série :
 *     356298581853603, 356298581847977, 356298581812476,
 *     356298581848926, 356298581849601, 356298581849767,
 *     356298581812518, 356298581854205, 356298581849833, 356298581849965
 *
 * Usage :
 *   node scripts/fix-itc2024-0116.js          → diagnostic
 *   node scripts/fix-itc2024-0116.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ── Données PDF ────────────────────────────────────────────────────────
const WRONG_NUMBER   = 'ITC-2014-0116';
const CORRECT_NUMBER = 'ITC-2024-0116';
const INVOICE_DATE   = '2024-12-25';
const DOSSIER        = '180-25672';

const SERIAL_NUMBERS = [
  '356298581853603', '356298581847977', '356298581812476',
  '356298581848926', '356298581849601', '356298581849767',
  '356298581812518', '356298581854205', '356298581849833',
  '356298581849965'
];

const EQUIPMENT = {
  title:                  'Galaxy Xcover 7 Enterprise Edition 256Go',
  serial_number:          SERIAL_NUMBERS,
  selling_price_excl_vat: 411.59,
  quantity:               10,
};

const LEASER_DATA = {
  name: 'GRENKE LEASE', address: 'Ruisbroeksesteenweg 76',
  city: 'Ukkel', postal_code: '1180', country: 'Belgique',
  email: '', phone: '', vat_number: 'BE 0873.803.219'
};

async function main() {
  console.log(`\n🔧 FIX ITC-2024-0116 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Trouver la facture ──────────────────────────────────────────────
  const { data: inv } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', WRONG_NUMBER)
    .single();

  if (!inv) {
    // Peut-être déjà renommée ?
    const { data: inv2 } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_date, offer_id, contract_id, billing_data')
      .eq('company_id', COMPANY_ID)
      .eq('invoice_number', CORRECT_NUMBER)
      .single();
    if (inv2) {
      console.log(`  ℹ️  Facture déjà renommée en ${CORRECT_NUMBER}`);
      Object.assign(inv2, { _alreadyRenamed: true });
      await processInvoice(inv2);
    } else {
      console.log('  ❌ Facture introuvable (ni ITC-2014-0116 ni ITC-2024-0116)');
    }
    return;
  }

  console.log('── Facture actuelle ──');
  console.log(`  id             : ${inv.id}`);
  console.log(`  invoice_number : ${inv.invoice_number}  ← à corriger`);
  console.log(`  invoice_date   : ${inv.invoice_date}`);
  console.log(`  offer_id       : ${inv.offer_id    || '(null)'}`);
  console.log(`  contract_id    : ${inv.contract_id || '(null)'}`);

  await processInvoice(inv);
}

async function processInvoice(inv) {
  // ── 2. Chercher client "Mamy Home" en DB ───────────────────────────────
  const { data: mamiResults } = await sb
    .from('clients')
    .select('id, name, company, email')
    .eq('company_id', COMPANY_ID)
    .or('name.ilike.%mamy%,company.ilike.%mamy%,name.ilike.%mami%,company.ilike.%mami%');

  console.log(`\n── Recherche "Mamy Home" ──`);
  if (!mamiResults?.length) {
    console.log('  ❌ Aucun client "Mamy" trouvé');
  } else {
    for (const c of mamiResults) {
      console.log(`  → id=${c.id} | name="${c.name}" | company="${c.company}" | email="${c.email}"`);
    }
  }

  const client = mamiResults?.[0] || null;
  const clientName    = client?.name    || 'Mamy Home';
  const clientCompany = client?.company || '';
  const clientEmail   = client?.email   || '';

  // ── 3. Contrat ────────────────────────────────────────────────────────
  let contract = null;
  if (inv.contract_id) {
    const { data } = await sb.from('contracts').select('id, offer_id, status, created_at').eq('id', inv.contract_id).single();
    contract = data;
    if (contract) console.log(`\n── Contrat : ${contract.id} | status=${contract.status}`);
  }

  // ── 4. Résumé actions ─────────────────────────────────────────────────
  console.log('\n══ ACTIONS ══════════════════════════════════════════\n');
  if (!inv._alreadyRenamed) {
    console.log(`  🔄 invoice_number : "${WRONG_NUMBER}" → "${CORRECT_NUMBER}"`);
  }
  console.log(`  🔄 billing_data complet (leaser, contrat, équipements x10, SNs)`);
  console.log(`  🔄 client : "${clientName}" ${clientCompany ? `(${clientCompany})` : ''}`);
  if (inv.contract_id) console.log(`  🔄 contract_equipment.title enrichi`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
    return;
  }

  // ── 5. APPLY ──────────────────────────────────────────────────────────
  const totalExclVat  = EQUIPMENT.selling_price_excl_vat * EQUIPMENT.quantity;
  const newBillingData = {
    leaser_data: LEASER_DATA,
    contract_data: {
      id:             contract?.id        || inv.contract_id || null,
      offer_id:       contract?.offer_id  || inv.offer_id    || null,
      created_at:     contract?.created_at || null,
      status:         contract?.status    || 'active',
      client_name:    clientName,
      client_company: clientCompany,
      client_email:   clientEmail,
    },
    equipment_data: [EQUIPMENT],
    invoice_totals: {
      total_excl_vat: totalExclVat,
      vat_amount:     Math.round(totalExclVat * 0.21 * 100) / 100,
      total_incl_vat: Math.round(totalExclVat * 1.21 * 100) / 100,
    },
  };

  const updates = { billing_data: newBillingData, updated_at: new Date().toISOString() };
  if (!inv._alreadyRenamed) {
    updates.invoice_number = CORRECT_NUMBER;
    updates.invoice_date   = INVOICE_DATE;
  }

  const { error } = await sb.from('invoices').update(updates).eq('id', inv.id);
  if (error) { console.log(`  ❌ invoice update: ${error.message}`); return; }
  console.log(`  ✅ Facture mise à jour : ${CORRECT_NUMBER} | billing_data complet`);

  // ── 6. contract_equipment.title ───────────────────────────────────────
  if (inv.contract_id) {
    const { data: ceRows } = await sb
      .from('contract_equipment')
      .select('id, title')
      .eq('contract_id', inv.contract_id);

    const snStr   = SERIAL_NUMBERS.join(', ');
    const newTitle = `${EQUIPMENT.title} | SN: ${snStr}`;

    if (ceRows?.length === 1) {
      const { error: ceErr } = await sb
        .from('contract_equipment')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', ceRows[0].id);
      if (ceErr) console.log(`  ❌ contract_equipment: ${ceErr.message}`);
      else console.log(`  ✅ contract_equipment.title enrichi avec 10 SNs`);
    } else {
      console.log(`  ⚠️  ${ceRows?.length || 0} lignes contract_equipment — mise à jour manuelle nécessaire`);
    }
  }

  console.log('\n  ✅ Terminé.\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
